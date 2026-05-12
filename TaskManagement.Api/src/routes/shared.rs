use crate::auth::AuthUser;
use crate::database::{
    get_tasks_by_workspace, get_topics_by_workspace, get_workspace_by_share_token,
    WorkspaceResponse,
};
use crate::errors::AppResult;
use rocket::serde::json::Json;
use rocket::{get, State};
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SharedWorkspaceResponse {
    pub workspace: WorkspaceResponse,
    pub topics: Vec<crate::database::TopicResponse>,
    pub tasks: Vec<crate::database::TaskResponse>,
}

#[get("/<token>")]
pub async fn get_shared_workspace(
    db: &State<DatabaseConnection>,
    _user: AuthUser,
    token: &str,
) -> AppResult<Json<SharedWorkspaceResponse>> {
    let workspace = get_workspace_by_share_token(db, token).await?;
    let topics = get_topics_by_workspace(db, workspace.id).await?;
    let tasks = get_tasks_by_workspace(db, workspace.id).await?;

    Ok(Json(SharedWorkspaceResponse {
        workspace: WorkspaceResponse::from(workspace),
        topics,
        tasks,
    }))
}
