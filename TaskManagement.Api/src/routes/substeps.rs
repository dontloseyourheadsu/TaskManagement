use crate::auth::AuthUser;
use crate::database::{
    create_substep, delete_substep, get_substep_by_id, get_substeps_by_task, update_substep,
    CreateSubstepRequest, SubstepResponse, UpdateSubstepRequest,
};
use crate::errors::{AppError, AppResult};
use rocket::serde::json::Json;
use rocket::{delete, get, post, put, State};
use sea_orm::DatabaseConnection;
use uuid::Uuid;

#[get("/<task_id>/substeps")]
pub async fn get_task_substeps(
    db: &State<DatabaseConnection>,
    user: AuthUser,
    task_id: &str,
) -> AppResult<Json<Vec<SubstepResponse>>> {
    let task_uuid = Uuid::parse_str(task_id)
        .map_err(|_| AppError::BadRequest("Invalid task ID format".to_string()))?;
    
    let substeps = get_substeps_by_task(db, user.id, task_uuid).await?;
    Ok(Json(substeps))
}

#[post("/<task_id>/substeps", data = "<request>")]
pub async fn create_task_substep(
    db: &State<DatabaseConnection>,
    user: AuthUser,
    task_id: &str,
    request: Json<CreateSubstepRequest>,
) -> AppResult<Json<SubstepResponse>> {
    let task_uuid = Uuid::parse_str(task_id)
        .map_err(|_| AppError::BadRequest("Invalid task ID format".to_string()))?;
    
    let substep = create_substep(db, user.id, task_uuid, request.into_inner()).await?;
    Ok(Json(substep))
}

#[get("/<substep_id>")]
pub async fn get_substep(
    db: &State<DatabaseConnection>,
    user: AuthUser,
    substep_id: &str,
) -> AppResult<Json<SubstepResponse>> {
    let substep_uuid = Uuid::parse_str(substep_id)
        .map_err(|_| AppError::BadRequest("Invalid substep ID format".to_string()))?;
    
    let substep = get_substep_by_id(db, user.id, substep_uuid).await?;
    Ok(Json(substep))
}

#[put("/<substep_id>", data = "<request>")]
pub async fn update_substep_route(
    db: &State<DatabaseConnection>,
    user: AuthUser,
    substep_id: &str,
    request: Json<UpdateSubstepRequest>,
) -> AppResult<Json<SubstepResponse>> {
    let substep_uuid = Uuid::parse_str(substep_id)
        .map_err(|_| AppError::BadRequest("Invalid substep ID format".to_string()))?;
    
    let substep = update_substep(db, user.id, substep_uuid, request.into_inner()).await?;
    Ok(Json(substep))
}

#[delete("/<substep_id>")]
pub async fn delete_substep_route(
    db: &State<DatabaseConnection>,
    user: AuthUser,
    substep_id: &str,
) -> AppResult<Json<bool>> {
    let substep_uuid = Uuid::parse_str(substep_id)
        .map_err(|_| AppError::BadRequest("Invalid substep ID format".to_string()))?;
    
    let deleted = delete_substep(db, user.id, substep_uuid).await?;
    Ok(Json(deleted))
}
