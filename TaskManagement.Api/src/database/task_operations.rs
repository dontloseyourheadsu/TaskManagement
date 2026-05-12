use crate::cache::{keys, Cache};
use crate::database::resolve_workspace_id;
use crate::errors::{AppError, AppResult};
use crate::models::{
    task::{self, Entity as Task, TaskType},
    task_exception::{self, Entity as TaskException},
    topic::{self, Entity as Topic},
    workspace::{self, Entity as Workspace},
};
use chrono::{Datelike, Timelike};
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
    pub workspace_id: Option<Uuid>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTaskRequest {
    pub topic_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub start_time: Option<chrono::DateTime<chrono::Utc>>,
    pub end_time: Option<chrono::DateTime<chrono::Utc>>,
    pub task_type: TaskType,
    pub color: String,
    pub urgent: bool,
    pub due_date: Option<chrono::DateTime<chrono::Utc>>,
    pub recurrence_type: Option<String>,
    pub recurrence_interval: Option<i32>,
    pub recurrence_days: Option<Vec<i32>>,
    pub recurrence_end_date: Option<chrono::DateTime<chrono::Utc>>,
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
    pub recurrence_type: Option<String>,
    pub recurrence_interval: Option<i32>,
    pub recurrence_days: Option<Vec<i32>>,
    pub recurrence_end_date: Option<chrono::DateTime<chrono::Utc>>,
    pub instance_date: Option<chrono::NaiveDate>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskResponse {
    pub id: Uuid,
    pub topic_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub start_time: Option<chrono::DateTime<chrono::Utc>>,
    pub end_time: Option<chrono::DateTime<chrono::Utc>>,
    pub task_type: TaskType,
    pub color: String,
    pub urgent: bool,
    pub completed: bool,
    pub due_date: Option<chrono::DateTime<chrono::Utc>>,
    pub recurrence_type: Option<String>,
    pub recurrence_interval: Option<i32>,
    pub recurrence_days: Option<Vec<i32>>,
    pub recurrence_end_date: Option<chrono::DateTime<chrono::Utc>>,
    pub instance_date: Option<chrono::NaiveDate>,
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
            recurrence_type: task.recurrence_type,
            recurrence_interval: task.recurrence_interval,
            recurrence_days: task.recurrence_days,
            recurrence_end_date: task.recurrence_end_date,
            instance_date: None,
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
        .inner_join(Workspace)
        .filter(workspace::Column::OwnerId.eq(user_id))
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
        recurrence_type: Set(request.recurrence_type),
        recurrence_interval: Set(request.recurrence_interval),
        recurrence_days: Set(request.recurrence_days),
        recurrence_end_date: Set(request.recurrence_end_date),
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
    workspace_id: Option<Uuid>,
) -> AppResult<Vec<TaskResponse>> {
    let resolved_workspace_id = resolve_workspace_id(db, user_id, workspace_id).await?;
    // Create cache key with date filters
    let cache_suffix = match (start_date, end_date) {
        (Some(start), Some(end)) => Some(format!("{}:{}", start.timestamp(), end.timestamp())),
        (Some(start), None) => Some(format!("{}:none", start.timestamp())),
        (None, Some(end)) => Some(format!("none:{}", end.timestamp())),
        (None, None) => None,
    };

    let cache_suffix = cache_suffix
        .map(|suffix| format!("workspace:{}:{}", resolved_workspace_id, suffix))
        .or_else(|| Some(format!("workspace:{}", resolved_workspace_id)));

    let cache_key = cache.generate_cache_key(keys::TASKS, &user_id, cache_suffix.as_deref());

    // Try to get from cache first
    if let Some(cached_tasks) = cache.get::<Vec<TaskResponse>>(&cache_key).await? {
        return Ok(cached_tasks);
    }

    // If not in cache, query database
    let mut query = Task::find()
        .inner_join(Topic)
        .join(JoinType::InnerJoin, topic::Relation::Workspace.def())
        .filter(workspace::Column::OwnerId.eq(user_id))
        .filter(topic::Column::WorkspaceId.eq(resolved_workspace_id));

    if let Some(start) = start_date {
        query = query.filter(task::Column::StartTime.gte(start));
    }

    if let Some(end) = end_date {
        query = query.filter(task::Column::EndTime.lte(end));
    }

    let tasks = query.order_by_asc(task::Column::StartTime).all(db).await?;

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
        .inner_join(Workspace)
        .filter(workspace::Column::OwnerId.eq(user_id))
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

pub async fn get_tasks_by_workspace(
    db: &DatabaseConnection,
    workspace_id: Uuid,
) -> AppResult<Vec<TaskResponse>> {
    let tasks = Task::find()
        .inner_join(Topic)
        .filter(topic::Column::WorkspaceId.eq(workspace_id))
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
        .join(JoinType::InnerJoin, topic::Relation::Workspace.def())
        .filter(workspace::Column::OwnerId.eq(user_id))
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
        .join(JoinType::InnerJoin, topic::Relation::Workspace.def())
        .filter(workspace::Column::OwnerId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Task not found".to_string()))?;

    // If instance_date is provided, we are updating a specific occurrence
    if let Some(instance_date) = request.instance_date {
        if let Some(completed) = request.completed {
            // Find or create exception
            let exception = TaskException::find()
                .filter(task_exception::Column::TaskId.eq(task_id))
                .filter(task_exception::Column::OriginalDate.eq(instance_date))
                .one(db)
                .await?;

            if let Some(exception) = exception {
                let mut exception: task_exception::ActiveModel = exception.into();
                exception.is_completed = Set(completed);
                exception.updated_at = Set(chrono::Utc::now());
                exception.update(db).await?;
            } else {
                let exception = task_exception::ActiveModel {
                    id: Set(Uuid::new_v4()),
                    task_id: Set(task_id),
                    original_date: Set(instance_date),
                    is_completed: Set(completed),
                    created_at: Set(chrono::Utc::now()),
                    updated_at: Set(chrono::Utc::now()),
                };
                exception.insert(db).await?;
            }
        }

        // Return the updated task representation for that instance
        let mut response = TaskResponse::from(task);
        response.instance_date = Some(instance_date);
        if let Some(completed) = request.completed {
            response.completed = completed;
        }
        return Ok(response);
    }

    let mut task: task::ActiveModel = task.into();

    if let Some(title) = request.title {
        task.title = Set(title);
    }

    if let Some(description) = request.description {
        task.description = Set(Some(description));
    }

    if let Some(start_time) = request.start_time {
        task.start_time = Set(Some(start_time));
    }

    if let Some(end_time) = request.end_time {
        task.end_time = Set(Some(end_time));
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

    if let Some(recurrence_type) = request.recurrence_type {
        task.recurrence_type = Set(Some(recurrence_type));
    }

    if let Some(recurrence_interval) = request.recurrence_interval {
        task.recurrence_interval = Set(Some(recurrence_interval));
    }

    if let Some(recurrence_days) = request.recurrence_days {
        task.recurrence_days = Set(Some(recurrence_days));
    }

    if let Some(recurrence_end_date) = request.recurrence_end_date {
        task.recurrence_end_date = Set(Some(recurrence_end_date));
    }

    let task = task.update(db).await?;
    Ok(TaskResponse::from(task))
}

pub async fn delete_task(db: &DatabaseConnection, user_id: Uuid, task_id: Uuid) -> AppResult<bool> {
    let task = Task::find_by_id(task_id)
        .inner_join(Topic)
        .join(JoinType::InnerJoin, topic::Relation::Workspace.def())
        .filter(workspace::Column::OwnerId.eq(user_id))
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
    let resolved_workspace_id = resolve_workspace_id(db, user_id, options.workspace_id).await?;
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
        .join(JoinType::InnerJoin, topic::Relation::Workspace.def())
        .filter(workspace::Column::OwnerId.eq(user_id))
        .filter(topic::Column::WorkspaceId.eq(resolved_workspace_id));

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

    // Fetch exceptions for all these tasks in one go if possible, or per task
    // For simplicity, we'll fetch them as needed or fetch all user exceptions
    let task_ids: Vec<Uuid> = tasks.iter().map(|t| t.id).collect();
    let exceptions = TaskException::find()
        .filter(task_exception::Column::TaskId.is_in(task_ids))
        .all(db)
        .await?;

    let mut all_task_responses = Vec::new();

    for task_model in tasks {
        if task_model.recurrence_type.is_none() {
            all_task_responses.push(TaskResponse::from(task_model));
        } else {
            // Expand recurrent task
            if let (Some(start_range), Some(end_range)) = (options.start_date, options.end_date) {
                let expanded = expand_task(task_model, start_range, end_range, &exceptions);
                all_task_responses.extend(expanded);
            } else {
                // If no range provided, just return the template (or maybe we should return a few instances?)
                // For now, return template as is
                all_task_responses.push(TaskResponse::from(task_model));
            }
        }
    }

    // Sort all_task_responses based on sort_field and sort_order after expansion
    sort_task_responses(
        &mut all_task_responses,
        &options.sort_field,
        &options.sort_order,
    );

    // Apply pagination after expansion and sorting
    let final_responses = if let Some(offset) = options.offset {
        all_task_responses
            .into_iter()
            .skip(offset)
            .collect::<Vec<_>>()
    } else {
        all_task_responses
    };

    let final_responses = if let Some(limit) = options.limit {
        final_responses.into_iter().take(limit).collect::<Vec<_>>()
    } else {
        final_responses
    };

    // Cache the result (only if no pagination)
    if options.limit.is_none() && options.offset.is_none() {
        if let Err(e) = cache.set(&cache_key, &final_responses).await {
            eprintln!("Failed to cache filtered tasks: {}", e);
        }
    }

    Ok(final_responses)
}

fn expand_task(
    task: task::Model,
    start_range: chrono::DateTime<chrono::Utc>,
    end_range: chrono::DateTime<chrono::Utc>,
    exceptions: &[task_exception::Model],
) -> Vec<TaskResponse> {
    let mut expanded = Vec::new();
    let recurrence_type = match task.recurrence_type.as_deref() {
        Some("daily") => "daily",
        Some("weekly") => "weekly",
        Some("monthly") => "monthly",
        _ => return vec![TaskResponse::from(task)],
    };

    let interval = task.recurrence_interval.unwrap_or(1) as i64;
    let mut current_date = task.start_time.unwrap_or(task.created_at);

    // Ensure we start after or at start_range, but also respect the task's start time
    // This logic is simplified; a real recurrence engine would be more robust

    // Find the first occurrence after or at start_range
    // For daily:
    if recurrence_type == "daily" {
        while current_date < start_range {
            current_date += chrono::Duration::days(interval);
        }
    } else if recurrence_type == "weekly" {
        // More complex: check recurrence_days
        let days = task.recurrence_days.clone().unwrap_or_default();
        // Skip ahead to start_range's week
        while current_date < start_range - chrono::Duration::days(7) {
            current_date += chrono::Duration::days(7 * interval);
        }
    }
    // ... Simplified monthly logic omitted for brevity in this initial implementation ...

    while current_date <= end_range {
        if let Some(end_recurrence) = task.recurrence_end_date {
            if current_date > end_recurrence {
                break;
            }
        }

        let instance_date = current_date.date_naive();

        // Check if this specific day is allowed (for weekly)
        let is_allowed = match recurrence_type {
            "daily" => true,
            "weekly" => {
                let weekday = current_date.weekday().num_days_from_monday() as i32;
                task.recurrence_days
                    .as_ref()
                    .map_or(true, |days| days.contains(&weekday))
            }
            "monthly" => {
                // Occurs on the same day of the month
                let original_day = task.start_time.unwrap_or(task.created_at).day();
                current_date.day() == original_day
            }
            _ => false,
        };

        if is_allowed {
            let mut response = TaskResponse::from(task.clone());

            // Adjust start/end time for this instance
            let duration = task.end_time.and_then(|e| task.start_time.map(|s| e - s));
            response.start_time = Some(current_date);
            response.end_time = duration.map(|d| current_date + d);
            response.instance_date = Some(instance_date);

            // Apply exceptions
            if let Some(exc) = exceptions
                .iter()
                .find(|e| e.task_id == task.id && e.original_date == instance_date)
            {
                response.completed = exc.is_completed;
            }

            expanded.push(response);
        }

        // Advance current_date
        match recurrence_type {
            "daily" => current_date += chrono::Duration::days(interval),
            "weekly" => {
                // If it's a day-specific weekly, we might need to check every day
                current_date += chrono::Duration::days(1);
                // If we cross a week boundary, respect interval?
                // Simplified: just check every day for now if weekly with days
            }
            "monthly" => {
                // Advance to next month
                let mut next_month = current_date.month() + 1;
                let mut next_year = current_date.year();
                if next_month > 12 {
                    next_month = 1;
                    next_year += 1;
                }
                current_date = current_date
                    .with_year(next_year)
                    .unwrap()
                    .with_month(next_month)
                    .unwrap();
            }
            _ => break,
        }

        // Safety break to prevent infinite loops if logic is flawed
        if expanded.len() > 100 {
            break;
        }
    }

    expanded
}

fn sort_task_responses(tasks: &mut Vec<TaskResponse>, field: &SortField, order: &SortOrder) {
    tasks.sort_by(|a, b| {
        let res = match field {
            SortField::CreatedAt => a.created_at.cmp(&b.created_at),
            SortField::UpdatedAt => a.updated_at.cmp(&b.updated_at),
            SortField::StartTime => a.start_time.cmp(&b.start_time),
            SortField::EndTime => a.end_time.cmp(&b.end_time),
            SortField::Title => a.title.cmp(&b.title),
            SortField::DueDate => a.due_date.cmp(&b.due_date),
        };
        match order {
            SortOrder::Asc => res,
            SortOrder::Desc => res.reverse(),
        }
    });
}

fn generate_filter_cache_suffix(options: &TaskFilterOptions) -> Option<String> {
    let mut parts = Vec::new();

    if let Some(workspace_id) = options.workspace_id {
        parts.push(format!("workspace:{}", workspace_id));
    }

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

    parts.push(format!(
        "sort:{:?}:{:?}",
        options.sort_field, options.sort_order
    ));

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
