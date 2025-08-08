use crate::errors::{AppError, AppResult};
use crate::models::{task::{self, Entity as Task, TaskType}, topic::{self, Entity as Topic}};
use crate::cache::{Cache, keys};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub enum SortOrder {
    Asc,
    Desc,
}

impl std::str::FromStr for SortOrder {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "asc" | "ascending" => Ok(SortOrder::Asc),
            "desc" | "descending" => Ok(SortOrder::Desc),
            _ => Err(format!("Invalid sort order: {}", s)),
        }
    }
}

#[derive(Debug, Clone)]
pub enum SortField {
    CreatedAt,
    UpdatedAt,
    StartTime,
    EndTime,
    Title,
    DueDate,
}

impl std::str::FromStr for SortField {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "created_at" | "createdat" => Ok(SortField::CreatedAt),
            "updated_at" | "updatedat" => Ok(SortField::UpdatedAt),
            "start_time" | "starttime" => Ok(SortField::StartTime),
            "end_time" | "endtime" => Ok(SortField::EndTime),
            "title" => Ok(SortField::Title),
            "due_date" | "duedate" => Ok(SortField::DueDate),
            _ => Err(format!("Invalid sort field: {}", s)),
        }
    }
}

#[derive(Debug)]
pub struct TaskFilterOptions {
    pub start_date: Option<chrono::DateTime<chrono::Utc>>,
    pub end_date: Option<chrono::DateTime<chrono::Utc>>,
    pub task_types: Option<Vec<TaskType>>,
    pub completed: Option<bool>,
    pub urgent: Option<bool>,
    pub title_contains: Option<String>,
    pub sort_field: SortField,
    pub sort_order: SortOrder,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTaskRequest {
    pub topic_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub start_time: chrono::DateTime<chrono::Utc>,
    pub end_time: chrono::DateTime<chrono::Utc>,
    pub task_type: TaskType,
    pub color: String,
    pub urgent: bool,
    pub due_date: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTaskRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub start_time: Option<chrono::DateTime<chrono::Utc>>,
    pub end_time: Option<chrono::DateTime<chrono::Utc>>,
    pub task_type: Option<TaskType>,
    pub color: Option<String>,
    pub urgent: Option<bool>,
    pub completed: Option<bool>,
    pub due_date: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TaskResponse {
    pub id: Uuid,
    pub topic_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub start_time: chrono::DateTime<chrono::Utc>,
    pub end_time: chrono::DateTime<chrono::Utc>,
    pub task_type: TaskType,
    pub color: String,
    pub urgent: bool,
    pub completed: bool,
    pub due_date: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<task::Model> for TaskResponse {
    fn from(task: task::Model) -> Self {
        Self {
            id: task.id,
            topic_id: task.topic_id,
            title: task.title,
            description: task.description,
            start_time: task.start_time,
            end_time: task.end_time,
            task_type: task.task_type,
            color: task.color,
            urgent: task.urgent,
            completed: task.completed,
            due_date: task.due_date,
            created_at: task.created_at,
            updated_at: task.updated_at,
        }
    }
}

pub async fn create_task(
    db: &DatabaseConnection,
    cache: &Cache,
    user_id: Uuid,
    request: CreateTaskRequest,
) -> AppResult<TaskResponse> {
    // Verify that the topic belongs to the user
    let _topic = Topic::find_by_id(request.topic_id)
        .filter(topic::Column::UserId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Topic not found".to_string()))?;

    let task = task::ActiveModel {
        topic_id: Set(request.topic_id),
        title: Set(request.title),
        description: Set(request.description),
        start_time: Set(request.start_time),
        end_time: Set(request.end_time),
        task_type: Set(request.task_type),
        color: Set(request.color),
        urgent: Set(request.urgent),
        completed: Set(false),
        due_date: Set(request.due_date),
        ..Default::default()
    };

    let task = task.insert(db).await?;
    
    // Invalidate cache for this user's tasks
    invalidate_tasks_cache(cache, user_id).await;
    
    Ok(TaskResponse::from(task))
}

pub async fn get_tasks_by_user(
    db: &DatabaseConnection,
    cache: &Cache,
    user_id: Uuid,
    start_date: Option<chrono::DateTime<chrono::Utc>>,
    end_date: Option<chrono::DateTime<chrono::Utc>>,
) -> AppResult<Vec<TaskResponse>> {
    // Create cache key with date filters
    let cache_suffix = match (start_date, end_date) {
        (Some(start), Some(end)) => Some(format!("{}:{}", start.timestamp(), end.timestamp())),
        (Some(start), None) => Some(format!("{}:none", start.timestamp())),
        (None, Some(end)) => Some(format!("none:{}", end.timestamp())),
        (None, None) => None,
    };
    
    let cache_key = cache.generate_cache_key(keys::TASKS, &user_id, cache_suffix.as_deref());
    
    // Try to get from cache first
    if let Some(cached_tasks) = cache.get::<Vec<TaskResponse>>(&cache_key).await? {
        return Ok(cached_tasks);
    }
    
    // If not in cache, query database
    let mut query = Task::find()
        .inner_join(Topic)
        .filter(topic::Column::UserId.eq(user_id));

    if let Some(start) = start_date {
        query = query.filter(task::Column::StartTime.gte(start));
    }

    if let Some(end) = end_date {
        query = query.filter(task::Column::EndTime.lte(end));
    }

    let tasks = query
        .order_by_asc(task::Column::StartTime)
        .all(db)
        .await?;

    let task_responses: Vec<TaskResponse> = tasks.into_iter().map(TaskResponse::from).collect();
    
    // Cache the result
    if let Err(e) = cache.set(&cache_key, &task_responses).await {
        // Log the error but don't fail the request
        eprintln!("Failed to cache tasks: {}", e);
    }
    
    Ok(task_responses)
}

pub async fn get_tasks_by_topic(
    db: &DatabaseConnection,
    user_id: Uuid,
    topic_id: Uuid,
) -> AppResult<Vec<TaskResponse>> {
    // Verify that the topic belongs to the user
    let _topic = Topic::find_by_id(topic_id)
        .filter(topic::Column::UserId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Topic not found".to_string()))?;

    let tasks = Task::find()
        .filter(task::Column::TopicId.eq(topic_id))
        .order_by_asc(task::Column::StartTime)
        .all(db)
        .await?;

    Ok(tasks.into_iter().map(TaskResponse::from).collect())
}

pub async fn get_task_by_id(
    db: &DatabaseConnection,
    user_id: Uuid,
    task_id: Uuid,
) -> AppResult<TaskResponse> {
    let task = Task::find_by_id(task_id)
        .inner_join(Topic)
        .filter(topic::Column::UserId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Task not found".to_string()))?;

    Ok(TaskResponse::from(task))
}

pub async fn update_task(
    db: &DatabaseConnection,
    user_id: Uuid,
    task_id: Uuid,
    request: UpdateTaskRequest,
) -> AppResult<TaskResponse> {
    let task = Task::find_by_id(task_id)
        .inner_join(Topic)
        .filter(topic::Column::UserId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Task not found".to_string()))?;

    let mut task: task::ActiveModel = task.into();

    if let Some(title) = request.title {
        task.title = Set(title);
    }

    if let Some(description) = request.description {
        task.description = Set(Some(description));
    }

    if let Some(start_time) = request.start_time {
        task.start_time = Set(start_time);
    }

    if let Some(end_time) = request.end_time {
        task.end_time = Set(end_time);
    }

    if let Some(task_type) = request.task_type {
        task.task_type = Set(task_type);
    }

    if let Some(color) = request.color {
        task.color = Set(color);
    }

    if let Some(urgent) = request.urgent {
        task.urgent = Set(urgent);
    }

    if let Some(completed) = request.completed {
        task.completed = Set(completed);
    }

    if let Some(due_date) = request.due_date {
        task.due_date = Set(Some(due_date));
    }

    let task = task.update(db).await?;
    Ok(TaskResponse::from(task))
}

pub async fn delete_task(
    db: &DatabaseConnection,
    user_id: Uuid,
    task_id: Uuid,
) -> AppResult<bool> {
    let task = Task::find_by_id(task_id)
        .inner_join(Topic)
        .filter(topic::Column::UserId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Task not found".to_string()))?;

    Task::delete_by_id(task.id).exec(db).await?;
    Ok(true)
}

pub async fn get_tasks_by_user_filtered(
    db: &DatabaseConnection,
    cache: &Cache,
    user_id: Uuid,
    options: TaskFilterOptions,
) -> AppResult<Vec<TaskResponse>> {
    // Generate cache key based on filter options
    let cache_suffix = generate_filter_cache_suffix(&options);
    let cache_key = cache.generate_cache_key(keys::TASKS, &user_id, cache_suffix.as_deref());
    
    // Try to get from cache first (only if no limit/offset for simplicity)
    if options.limit.is_none() && options.offset.is_none() {
        if let Some(cached_tasks) = cache.get::<Vec<TaskResponse>>(&cache_key).await? {
            return Ok(cached_tasks);
        }
    }
    
    // Build the query
    let mut query = Task::find()
        .inner_join(Topic)
        .filter(topic::Column::UserId.eq(user_id));

    // Apply date filters
    if let Some(start) = options.start_date {
        query = query.filter(task::Column::StartTime.gte(start));
    }

    if let Some(end) = options.end_date {
        query = query.filter(task::Column::EndTime.lte(end));
    }

    // Apply task type filters
    if let Some(task_types) = options.task_types {
        query = query.filter(task::Column::TaskType.is_in(task_types));
    }

    // Apply completion filter
    if let Some(completed) = options.completed {
        query = query.filter(task::Column::Completed.eq(completed));
    }

    // Apply urgency filter
    if let Some(urgent) = options.urgent {
        query = query.filter(task::Column::Urgent.eq(urgent));
    }

    // Apply title filter (partial match)
    if let Some(title) = &options.title_contains {
        query = query.filter(task::Column::Title.contains(title));
    }

    // Apply sorting
    query = match (&options.sort_field, &options.sort_order) {
        (SortField::CreatedAt, SortOrder::Asc) => query.order_by_asc(task::Column::CreatedAt),
        (SortField::CreatedAt, SortOrder::Desc) => query.order_by_desc(task::Column::CreatedAt),
        (SortField::UpdatedAt, SortOrder::Asc) => query.order_by_asc(task::Column::UpdatedAt),
        (SortField::UpdatedAt, SortOrder::Desc) => query.order_by_desc(task::Column::UpdatedAt),
        (SortField::StartTime, SortOrder::Asc) => query.order_by_asc(task::Column::StartTime),
        (SortField::StartTime, SortOrder::Desc) => query.order_by_desc(task::Column::StartTime),
        (SortField::EndTime, SortOrder::Asc) => query.order_by_asc(task::Column::EndTime),
        (SortField::EndTime, SortOrder::Desc) => query.order_by_desc(task::Column::EndTime),
        (SortField::Title, SortOrder::Asc) => query.order_by_asc(task::Column::Title),
        (SortField::Title, SortOrder::Desc) => query.order_by_desc(task::Column::Title),
        (SortField::DueDate, SortOrder::Asc) => query.order_by_asc(task::Column::DueDate),
        (SortField::DueDate, SortOrder::Desc) => query.order_by_desc(task::Column::DueDate),
    };

    // Apply pagination
    if let Some(limit) = options.limit {
        query = query.limit(limit as u64);
    }

    if let Some(offset) = options.offset {
        query = query.offset(offset as u64);
    }

    let tasks = query.all(db).await?;
    let task_responses: Vec<TaskResponse> = tasks.into_iter().map(TaskResponse::from).collect();
    
    // Cache the result (only if no pagination)
    if options.limit.is_none() && options.offset.is_none() {
        if let Err(e) = cache.set(&cache_key, &task_responses).await {
            eprintln!("Failed to cache filtered tasks: {}", e);
        }
    }
    
    Ok(task_responses)
}

fn generate_filter_cache_suffix(options: &TaskFilterOptions) -> Option<String> {
    let mut parts = Vec::new();

    if let Some(start) = options.start_date {
        parts.push(format!("start:{}", start.timestamp()));
    }

    if let Some(end) = options.end_date {
        parts.push(format!("end:{}", end.timestamp()));
    }

    if let Some(types) = &options.task_types {
        let type_str: Vec<String> = types.iter().map(|t| format!("{:?}", t)).collect();
        parts.push(format!("types:{}", type_str.join(",")));
    }

    if let Some(completed) = options.completed {
        parts.push(format!("completed:{}", completed));
    }

    if let Some(urgent) = options.urgent {
        parts.push(format!("urgent:{}", urgent));
    }

    if let Some(title) = &options.title_contains {
        parts.push(format!("title:{}", title));
    }

    parts.push(format!("sort:{:?}:{:?}", options.sort_field, options.sort_order));

    if parts.is_empty() {
        None
    } else {
        Some(parts.join(":"))
    }
}

// Cache helper functions
async fn invalidate_tasks_cache(cache: &Cache, user_id: Uuid) {
    // This is a simple implementation - delete all possible cache keys for this user
    // In production, you might want to keep track of cache keys or use pattern matching
    let base_key = cache.generate_cache_key(keys::TASKS, &user_id, None);
    if let Err(e) = cache.delete(&base_key).await {
        eprintln!("Failed to invalidate tasks cache: {}", e);
    }
    
    // Note: In a more sophisticated implementation, you might want to:
    // 1. Track all cache keys for a user
    // 2. Use Redis pattern matching to delete multiple keys
    // 3. Use cache tagging for group invalidation
}
