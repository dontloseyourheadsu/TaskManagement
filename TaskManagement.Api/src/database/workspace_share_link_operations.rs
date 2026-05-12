use crate::errors::{AppError, AppResult};
use crate::models::{workspace, workspace_share_link};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateWorkspaceShareLinkRequest {
    pub expires_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceShareLinkResponse {
    pub id: Uuid,
    pub workspace_id: Uuid,
    pub created_by: Uuid,
    pub token: String,
    pub expires_at: Option<chrono::DateTime<chrono::Utc>>,
    pub revoked_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl From<workspace_share_link::Model> for WorkspaceShareLinkResponse {
    fn from(link: workspace_share_link::Model) -> Self {
        Self {
            id: link.id,
            workspace_id: link.workspace_id,
            created_by: link.created_by,
            token: link.token,
            expires_at: link.expires_at,
            revoked_at: link.revoked_at,
            created_at: link.created_at,
        }
    }
}

pub async fn create_workspace_share_link(
    db: &DatabaseConnection,
    user_id: Uuid,
    workspace_id: Uuid,
    request: CreateWorkspaceShareLinkRequest,
) -> AppResult<WorkspaceShareLinkResponse> {
    let _workspace = workspace::Entity::find_by_id(workspace_id)
        .filter(workspace::Column::OwnerId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Workspace not found".to_string()))?;

    let share_link = workspace_share_link::ActiveModel {
        workspace_id: Set(workspace_id),
        created_by: Set(user_id),
        token: Set(Uuid::new_v4().to_string()),
        expires_at: Set(request.expires_at),
        revoked_at: Set(None),
        ..Default::default()
    };

    let share_link = share_link.insert(db).await?;
    Ok(WorkspaceShareLinkResponse::from(share_link))
}

pub async fn list_workspace_share_links(
    db: &DatabaseConnection,
    user_id: Uuid,
    workspace_id: Uuid,
) -> AppResult<Vec<WorkspaceShareLinkResponse>> {
    let _workspace = workspace::Entity::find_by_id(workspace_id)
        .filter(workspace::Column::OwnerId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Workspace not found".to_string()))?;

    let links = workspace_share_link::Entity::find()
        .filter(workspace_share_link::Column::WorkspaceId.eq(workspace_id))
        .order_by_desc(workspace_share_link::Column::CreatedAt)
        .all(db)
        .await?;

    Ok(links
        .into_iter()
        .map(WorkspaceShareLinkResponse::from)
        .collect())
}

pub async fn revoke_workspace_share_link(
    db: &DatabaseConnection,
    user_id: Uuid,
    workspace_id: Uuid,
    share_link_id: Uuid,
) -> AppResult<WorkspaceShareLinkResponse> {
    let _workspace = workspace::Entity::find_by_id(workspace_id)
        .filter(workspace::Column::OwnerId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Workspace not found".to_string()))?;

    let share_link = workspace_share_link::Entity::find_by_id(share_link_id)
        .filter(workspace_share_link::Column::WorkspaceId.eq(workspace_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Share link not found".to_string()))?;

    let mut share_link: workspace_share_link::ActiveModel = share_link.into();
    share_link.revoked_at = Set(Some(chrono::Utc::now()));

    let share_link = share_link.update(db).await?;
    Ok(WorkspaceShareLinkResponse::from(share_link))
}
