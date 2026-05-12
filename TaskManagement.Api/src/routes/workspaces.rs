use crate::auth::AuthUser;
use crate::database::{
    create_workspace, create_workspace_share_link, delete_workspace, get_workspace_by_id,
    get_workspaces_by_user, list_workspace_share_links, revoke_workspace_share_link,
    update_workspace, CreateWorkspaceRequest, CreateWorkspaceShareLinkRequest,
    UpdateWorkspaceRequest, WorkspaceResponse, WorkspaceShareLinkResponse,
};
use crate::errors::{AppError, AppResult};
use rocket::serde::json::Json;
use rocket::{delete, get, post, put, State};
use sea_orm::DatabaseConnection;
use uuid::Uuid;

#[get("/")]
pub async fn get_workspaces(
    db: &State<DatabaseConnection>,
    user: AuthUser,
) -> AppResult<Json<Vec<WorkspaceResponse>>> {
    let workspaces = get_workspaces_by_user(db, user.id).await?;
    Ok(Json(workspaces))
}

#[get("/<workspace_id>")]
pub async fn get_workspace(
    db: &State<DatabaseConnection>,
    user: AuthUser,
    workspace_id: &str,
) -> AppResult<Json<WorkspaceResponse>> {
    let workspace_uuid = Uuid::parse_str(workspace_id)
        .map_err(|_| AppError::BadRequest("Invalid workspace ID format".to_string()))?;
    let workspace = get_workspace_by_id(db, user.id, workspace_uuid).await?;
    Ok(Json(workspace))
}

#[post("/", data = "<request>")]
pub async fn create_workspace_route(
    db: &State<DatabaseConnection>,
    user: AuthUser,
    request: Json<CreateWorkspaceRequest>,
) -> AppResult<Json<WorkspaceResponse>> {
    let workspace = create_workspace(db, user.id, request.into_inner()).await?;
    Ok(Json(workspace))
}

#[put("/<workspace_id>", data = "<request>")]
pub async fn update_workspace_route(
    db: &State<DatabaseConnection>,
    user: AuthUser,
    workspace_id: &str,
    request: Json<UpdateWorkspaceRequest>,
) -> AppResult<Json<WorkspaceResponse>> {
    let workspace_uuid = Uuid::parse_str(workspace_id)
        .map_err(|_| AppError::BadRequest("Invalid workspace ID format".to_string()))?;
    let workspace = update_workspace(db, user.id, workspace_uuid, request.into_inner()).await?;
    Ok(Json(workspace))
}

#[delete("/<workspace_id>")]
pub async fn delete_workspace_route(
    db: &State<DatabaseConnection>,
    user: AuthUser,
    workspace_id: &str,
) -> AppResult<Json<bool>> {
    let workspace_uuid = Uuid::parse_str(workspace_id)
        .map_err(|_| AppError::BadRequest("Invalid workspace ID format".to_string()))?;
    let result = delete_workspace(db, user.id, workspace_uuid).await?;
    Ok(Json(result))
}

#[post("/<workspace_id>/share-links", data = "<request>")]
pub async fn create_workspace_share_link_route(
    db: &State<DatabaseConnection>,
    user: AuthUser,
    workspace_id: &str,
    request: Json<CreateWorkspaceShareLinkRequest>,
) -> AppResult<Json<WorkspaceShareLinkResponse>> {
    let workspace_uuid = Uuid::parse_str(workspace_id)
        .map_err(|_| AppError::BadRequest("Invalid workspace ID format".to_string()))?;
    let share_link =
        create_workspace_share_link(db, user.id, workspace_uuid, request.into_inner()).await?;
    Ok(Json(share_link))
}

#[get("/<workspace_id>/share-links")]
pub async fn get_workspace_share_links(
    db: &State<DatabaseConnection>,
    user: AuthUser,
    workspace_id: &str,
) -> AppResult<Json<Vec<WorkspaceShareLinkResponse>>> {
    let workspace_uuid = Uuid::parse_str(workspace_id)
        .map_err(|_| AppError::BadRequest("Invalid workspace ID format".to_string()))?;
    let links = list_workspace_share_links(db, user.id, workspace_uuid).await?;
    Ok(Json(links))
}

#[delete("/<workspace_id>/share-links/<share_link_id>")]
pub async fn revoke_workspace_share_link_route(
    db: &State<DatabaseConnection>,
    user: AuthUser,
    workspace_id: &str,
    share_link_id: &str,
) -> AppResult<Json<WorkspaceShareLinkResponse>> {
    let workspace_uuid = Uuid::parse_str(workspace_id)
        .map_err(|_| AppError::BadRequest("Invalid workspace ID format".to_string()))?;
    let share_link_uuid = Uuid::parse_str(share_link_id)
        .map_err(|_| AppError::BadRequest("Invalid share link ID format".to_string()))?;
    let link = revoke_workspace_share_link(db, user.id, workspace_uuid, share_link_uuid).await?;
    Ok(Json(link))
}
