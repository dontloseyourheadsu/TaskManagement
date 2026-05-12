use crate::errors::{AppError, AppResult};
use crate::models::{user, workspace, workspace_share_link};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateWorkspaceRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateWorkspaceRequest {
    pub name: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceResponse {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<workspace::Model> for WorkspaceResponse {
    fn from(workspace: workspace::Model) -> Self {
        Self {
            id: workspace.id,
            owner_id: workspace.owner_id,
            name: workspace.name,
            description: workspace.description,
            created_at: workspace.created_at,
            updated_at: workspace.updated_at,
        }
    }
}

pub async fn create_default_workspace(
    db: &DatabaseConnection,
    user_id: Uuid,
) -> AppResult<workspace::Model> {
    let workspace = workspace::ActiveModel {
        owner_id: Set(user_id),
        name: Set("My Workspace".to_string()),
        description: Set(Some("Default workspace".to_string())),
        ..Default::default()
    };

    let workspace = workspace.insert(db).await?;
    Ok(workspace)
}

pub async fn ensure_default_workspace(
    db: &DatabaseConnection,
    user_id: Uuid,
) -> AppResult<workspace::Model> {
    let user_model = user::Entity::find_by_id(user_id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    if let Some(workspace_id) = user_model.default_workspace_id {
        if let Some(existing) = workspace::Entity::find_by_id(workspace_id)
            .filter(workspace::Column::OwnerId.eq(user_id))
            .one(db)
            .await?
        {
            return Ok(existing);
        }
    }

    let workspace = create_default_workspace(db, user_id).await?;

    let mut user_active: user::ActiveModel = user_model.into();
    user_active.default_workspace_id = Set(Some(workspace.id));
    user_active.update(db).await?;

    Ok(workspace)
}

pub async fn resolve_workspace_id(
    db: &DatabaseConnection,
    user_id: Uuid,
    requested: Option<Uuid>,
) -> AppResult<Uuid> {
    if let Some(workspace_id) = requested {
        let exists = workspace::Entity::find_by_id(workspace_id)
            .filter(workspace::Column::OwnerId.eq(user_id))
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("Workspace not found".to_string()))?;
        return Ok(exists.id);
    }

    let workspace = ensure_default_workspace(db, user_id).await?;
    Ok(workspace.id)
}

pub async fn create_workspace(
    db: &DatabaseConnection,
    user_id: Uuid,
    request: CreateWorkspaceRequest,
) -> AppResult<WorkspaceResponse> {
    let workspace = workspace::ActiveModel {
        owner_id: Set(user_id),
        name: Set(request.name),
        description: Set(request.description),
        ..Default::default()
    };

    let workspace = workspace.insert(db).await?;

    let user_model = user::Entity::find_by_id(user_id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    if user_model.default_workspace_id.is_none() {
        let mut user_active: user::ActiveModel = user_model.into();
        user_active.default_workspace_id = Set(Some(workspace.id));
        let _ = user_active.update(db).await?;
    }

    Ok(WorkspaceResponse::from(workspace))
}

pub async fn get_workspaces_by_user(
    db: &DatabaseConnection,
    user_id: Uuid,
) -> AppResult<Vec<WorkspaceResponse>> {
    let workspaces = workspace::Entity::find()
        .filter(workspace::Column::OwnerId.eq(user_id))
        .order_by_asc(workspace::Column::Name)
        .all(db)
        .await?;

    Ok(workspaces
        .into_iter()
        .map(WorkspaceResponse::from)
        .collect())
}

pub async fn get_workspace_by_id(
    db: &DatabaseConnection,
    user_id: Uuid,
    workspace_id: Uuid,
) -> AppResult<WorkspaceResponse> {
    let workspace = workspace::Entity::find_by_id(workspace_id)
        .filter(workspace::Column::OwnerId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Workspace not found".to_string()))?;

    Ok(WorkspaceResponse::from(workspace))
}

pub async fn update_workspace(
    db: &DatabaseConnection,
    user_id: Uuid,
    workspace_id: Uuid,
    request: UpdateWorkspaceRequest,
) -> AppResult<WorkspaceResponse> {
    let workspace = workspace::Entity::find_by_id(workspace_id)
        .filter(workspace::Column::OwnerId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Workspace not found".to_string()))?;

    let mut workspace: workspace::ActiveModel = workspace.into();

    if let Some(name) = request.name {
        workspace.name = Set(name);
    }

    if let Some(description) = request.description {
        workspace.description = Set(Some(description));
    }

    let workspace = workspace.update(db).await?;
    Ok(WorkspaceResponse::from(workspace))
}

pub async fn delete_workspace(
    db: &DatabaseConnection,
    user_id: Uuid,
    workspace_id: Uuid,
) -> AppResult<bool> {
    let workspace = workspace::Entity::find_by_id(workspace_id)
        .filter(workspace::Column::OwnerId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Workspace not found".to_string()))?;

    workspace::Entity::delete_by_id(workspace.id)
        .exec(db)
        .await?;

    let user_model = user::Entity::find_by_id(user_id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    if user_model.default_workspace_id == Some(workspace_id) {
        let remaining = workspace::Entity::find()
            .filter(workspace::Column::OwnerId.eq(user_id))
            .order_by_asc(workspace::Column::CreatedAt)
            .one(db)
            .await?;

        let mut user_active: user::ActiveModel = user_model.into();
        user_active.default_workspace_id = Set(remaining.map(|w| w.id));
        user_active.update(db).await?;
    }

    Ok(true)
}

pub async fn user_owns_workspace(
    db: &DatabaseConnection,
    user_id: Uuid,
    workspace_id: Uuid,
) -> AppResult<()> {
    let workspace = workspace::Entity::find_by_id(workspace_id)
        .filter(workspace::Column::OwnerId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::Forbidden("Access denied".to_string()))?;
    let _ = workspace.id;
    Ok(())
}

pub async fn get_workspace_by_share_token(
    db: &DatabaseConnection,
    token: &str,
) -> AppResult<workspace::Model> {
    let now = chrono::Utc::now();

    let share_link = workspace_share_link::Entity::find()
        .filter(workspace_share_link::Column::Token.eq(token))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Share link not found".to_string()))?;

    if let Some(revoked_at) = share_link.revoked_at {
        if revoked_at <= now {
            return Err(AppError::Forbidden("Share link revoked".to_string()));
        }
    }

    if let Some(expires_at) = share_link.expires_at {
        if expires_at <= now {
            return Err(AppError::Forbidden("Share link expired".to_string()));
        }
    }

    let workspace = workspace::Entity::find_by_id(share_link.workspace_id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Workspace not found".to_string()))?;

    Ok(workspace)
}
