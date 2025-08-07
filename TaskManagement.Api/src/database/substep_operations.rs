use crate::errors::{AppError, AppResult};
use crate::models::{task_substep::{self, Entity as TaskSubstep}, task::Entity as Task};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSubstepRequest {
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSubstepRequest {
    pub description: Option<String>,
    pub completed: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SubstepResponse {
    pub id: Uuid,
    pub task_id: Uuid,
    pub description: String,
    pub completed: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<task_substep::Model> for SubstepResponse {
    fn from(substep: task_substep::Model) -> Self {
        Self {
            id: substep.id,
            task_id: substep.task_id,
            description: substep.description,
            completed: substep.completed,
            created_at: substep.created_at,
            updated_at: substep.updated_at,
        }
    }
}

pub async fn create_substep(
    db: &DatabaseConnection,
    user_id: Uuid,
    task_id: Uuid,
    request: CreateSubstepRequest,
) -> AppResult<SubstepResponse> {
    // First verify that the task exists and belongs to the user
    let task = Task::find_by_id(task_id)
        .find_also_related(crate::models::topic::Entity)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Task not found".to_string()))?;

    // Check if the task belongs to the user through topic ownership
    let (_, topic) = task;
    let topic = topic.ok_or_else(|| AppError::NotFound("Topic not found".to_string()))?;
    
    if topic.user_id != user_id {
        return Err(AppError::Forbidden("Access denied".to_string()));
    }

    let substep = task_substep::ActiveModel {
        task_id: Set(task_id),
        description: Set(request.description),
        completed: Set(false),
        ..Default::default()
    };

    let substep = substep.insert(db).await?;
    Ok(SubstepResponse::from(substep))
}

pub async fn get_substeps_by_task(
    db: &DatabaseConnection,
    user_id: Uuid,
    task_id: Uuid,
) -> AppResult<Vec<SubstepResponse>> {
    // First verify that the task exists and belongs to the user
    let task = Task::find_by_id(task_id)
        .find_also_related(crate::models::topic::Entity)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Task not found".to_string()))?;

    // Check if the task belongs to the user through topic ownership
    let (_, topic) = task;
    let topic = topic.ok_or_else(|| AppError::NotFound("Topic not found".to_string()))?;
    
    if topic.user_id != user_id {
        return Err(AppError::Forbidden("Access denied".to_string()));
    }

    let substeps = TaskSubstep::find()
        .filter(task_substep::Column::TaskId.eq(task_id))
        .order_by_asc(task_substep::Column::CreatedAt)
        .all(db)
        .await?;

    Ok(substeps.into_iter().map(SubstepResponse::from).collect())
}

pub async fn get_substep_by_id(
    db: &DatabaseConnection,
    user_id: Uuid,
    substep_id: Uuid,
) -> AppResult<SubstepResponse> {
    let substep = TaskSubstep::find_by_id(substep_id)
        .find_also_related(Task)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Substep not found".to_string()))?;

    let (substep_model, task) = substep;
    let task = task.ok_or_else(|| AppError::NotFound("Task not found".to_string()))?;

    // Verify task belongs to user through topic
    let topic = crate::models::topic::Entity::find_by_id(task.topic_id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Topic not found".to_string()))?;
    
    if topic.user_id != user_id {
        return Err(AppError::Forbidden("Access denied".to_string()));
    }

    Ok(SubstepResponse::from(substep_model))
}

pub async fn update_substep(
    db: &DatabaseConnection,
    user_id: Uuid,
    substep_id: Uuid,
    request: UpdateSubstepRequest,
) -> AppResult<SubstepResponse> {
    // First get the substep and verify ownership
    let _existing_substep = get_substep_by_id(db, user_id, substep_id).await?;

    let mut substep: task_substep::ActiveModel = TaskSubstep::find_by_id(substep_id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Substep not found".to_string()))?
        .into();

    if let Some(description) = request.description {
        substep.description = Set(description);
    }

    if let Some(completed) = request.completed {
        substep.completed = Set(completed);
    }

    let substep = substep.update(db).await?;
    Ok(SubstepResponse::from(substep))
}

pub async fn delete_substep(
    db: &DatabaseConnection,
    user_id: Uuid,
    substep_id: Uuid,
) -> AppResult<bool> {
    // Verify ownership first
    let _ = get_substep_by_id(db, user_id, substep_id).await?;

    let result = TaskSubstep::delete_by_id(substep_id).exec(db).await?;
    Ok(result.rows_affected > 0)
}
