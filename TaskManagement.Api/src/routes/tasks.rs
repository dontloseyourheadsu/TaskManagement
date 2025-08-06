use crate::auth::AuthUser;
use crate::database::{
    create_task, delete_task, get_task_by_id, get_tasks_by_topic, get_tasks_by_user, update_task,
    CreateTaskRequest, TaskResponse, UpdateTaskRequest,
};
use crate::errors::{AppError, AppResult};
use rocket::serde::json::Json;
use rocket::{delete, get, post, put, State};
use sea_orm::DatabaseConnection;
use uuid::Uuid;

#[derive(rocket::FromForm)]
pub struct TaskFilters {
    pub topic_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[get("/?<filters..>")]
pub async fn get_tasks(
    db: &State<DatabaseConnection>,
    user: AuthUser,
    filters: TaskFilters,
) -> AppResult<Json<Vec<TaskResponse>>> {
    let tasks = if let Some(topic_id_str) = filters.topic_id {
        let topic_uuid = Uuid::parse_str(&topic_id_str)
            .map_err(|_| AppError::BadRequest("Invalid topic ID format".to_string()))?;
        get_tasks_by_topic(db, user.id, topic_uuid).await?
    } else {
        let start_date = filters.start_date
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
            .map(|dt| dt.with_timezone(&chrono::Utc));
        
        let end_date = filters.end_date
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
            .map(|dt| dt.with_timezone(&chrono::Utc));

        get_tasks_by_user(db, user.id, start_date, end_date).await?
    };
    
    Ok(Json(tasks))
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
    user: AuthUser,
    request: Json<CreateTaskRequest>,
) -> AppResult<Json<TaskResponse>> {
    let task = create_task(db, user.id, request.into_inner()).await?;
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
