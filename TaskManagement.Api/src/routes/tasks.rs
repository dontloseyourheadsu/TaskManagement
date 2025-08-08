use crate::auth::AuthUser;
use crate::cache::Cache;
use crate::database::{
    create_task, delete_task, get_task_by_id, get_tasks_by_topic, get_tasks_by_user_filtered, update_task,
    CreateTaskRequest, TaskResponse, UpdateTaskRequest, TaskFilterOptions, SortField, SortOrder,
};
use crate::errors::{AppError, AppResult};
use crate::models::task::TaskType;
use rocket::serde::json::Json;
use rocket::{delete, get, post, put, State};
use sea_orm::DatabaseConnection;
use uuid::Uuid;

#[derive(rocket::FromForm)]
pub struct TaskFilters {
    pub topic_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    // Filtering options
    pub task_type: Option<String>, // Can be comma-separated for multiple values
    pub completed: Option<bool>,
    pub urgent: Option<bool>,
    pub title: Option<String>, // Partial match
    // Sorting options
    #[field(name = "$orderby")]
    pub order_by: Option<String>, // Format: "field asc|desc"
    // Pagination (optional for future use)
    #[field(name = "$top")]
    pub top: Option<u32>,
    #[field(name = "$skip")]
    pub skip: Option<u32>,
}

#[get("/?<filters..>")]
pub async fn get_tasks(
    db: &State<DatabaseConnection>,
    cache: &State<Cache>,
    user: AuthUser,
    filters: TaskFilters,
) -> AppResult<Json<Vec<TaskResponse>>> {
    let tasks = if let Some(topic_id_str) = filters.topic_id {
        let topic_uuid = Uuid::parse_str(&topic_id_str)
            .map_err(|_| AppError::BadRequest("Invalid topic ID format".to_string()))?;
        get_tasks_by_topic(db, user.id, topic_uuid).await?
    } else {
        // Parse sorting options
        let (sort_field, sort_order) = if let Some(order_by) = filters.order_by {
            parse_order_by(&order_by)?
        } else {
            (SortField::CreatedAt, SortOrder::Desc) // Default: latest first
        };

        // Parse task types if provided
        let task_types = if let Some(types_str) = filters.task_type {
            let types: Result<Vec<_>, _> = types_str
                .split(',')
                .map(|s| s.trim().parse())
                .collect();
            Some(types.map_err(|e| AppError::BadRequest(format!("Invalid task type: {}", e)))?)
        } else {
            None
        };

        // Parse date filters
        let start_date = filters.start_date
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
            .map(|dt| dt.with_timezone(&chrono::Utc));
        
        let end_date = filters.end_date
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
            .map(|dt| dt.with_timezone(&chrono::Utc));

        // Create filter options struct
        let filter_options = TaskFilterOptions {
            start_date,
            end_date,
            task_types,
            completed: filters.completed,
            urgent: filters.urgent,
            title_contains: filters.title,
            sort_field,
            sort_order,
            limit: filters.top.map(|t| t as usize),
            offset: filters.skip.map(|s| s as usize),
        };

        get_tasks_by_user_filtered(db, cache, user.id, filter_options).await?
    };
    
    Ok(Json(tasks))
}

fn parse_order_by(order_by: &str) -> AppResult<(SortField, SortOrder)> {
    let parts: Vec<&str> = order_by.split_whitespace().collect();
    
    if parts.is_empty() {
        return Err(AppError::BadRequest("Empty orderby parameter".to_string()));
    }

    let field = parts[0].parse::<SortField>()
        .map_err(|e| AppError::BadRequest(e))?;
    
    let order = if parts.len() > 1 {
        parts[1].parse::<SortOrder>()
            .map_err(|e| AppError::BadRequest(e))?
    } else {
        SortOrder::Asc
    };

    Ok((field, order))
}

#[get("/<task_id>")]
pub async fn get_task(
    db: &State<DatabaseConnection>,
    user: AuthUser,
    task_id: &str,
) -> AppResult<Json<TaskResponse>> {
    let task_uuid = Uuid::parse_str(task_id)
        .map_err(|_| AppError::BadRequest("Invalid task ID format".to_string()))?;
    let task = get_task_by_id(db, user.id, task_uuid).await?;
    Ok(Json(task))
}

#[post("/", data = "<request>")]
pub async fn create_task_route(
    db: &State<DatabaseConnection>,
    cache: &State<Cache>,
    user: AuthUser,
    request: Json<CreateTaskRequest>,
) -> AppResult<Json<TaskResponse>> {
    let task = create_task(db, cache, user.id, request.into_inner()).await?;
    Ok(Json(task))
}

#[put("/<task_id>", data = "<request>")]
pub async fn update_task_route(
    db: &State<DatabaseConnection>,
    user: AuthUser,
    task_id: &str,
    request: Json<UpdateTaskRequest>,
) -> AppResult<Json<TaskResponse>> {
    let task_uuid = Uuid::parse_str(task_id)
        .map_err(|_| AppError::BadRequest("Invalid task ID format".to_string()))?;
    let task = update_task(db, user.id, task_uuid, request.into_inner()).await?;
    Ok(Json(task))
}

#[delete("/<task_id>")]
pub async fn delete_task_route(
    db: &State<DatabaseConnection>,
    user: AuthUser,
    task_id: &str,
) -> AppResult<Json<bool>> {
    let task_uuid = Uuid::parse_str(task_id)
        .map_err(|_| AppError::BadRequest("Invalid task ID format".to_string()))?;
    let result = delete_task(db, user.id, task_uuid).await?;
    Ok(Json(result))
}
