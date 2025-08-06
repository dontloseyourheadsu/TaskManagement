use crate::auth::AuthUser;
use crate::database::{
    create_topic, delete_topic, get_topic_by_id, get_topics_by_user, update_topic,
    CreateTopicRequest, TopicResponse, UpdateTopicRequest,
};
use crate::errors::{AppError, AppResult};
use rocket::serde::json::Json;
use rocket::{delete, get, post, put, State};
use sea_orm::DatabaseConnection;
use uuid::Uuid;

#[get("/")]
pub async fn get_topics(
    db: &State<DatabaseConnection>,
    user: AuthUser,
) -> AppResult<Json<Vec<TopicResponse>>> {
    let topics = get_topics_by_user(db, user.id).await?;
    Ok(Json(topics))
}

#[get("/<topic_id>")]
pub async fn get_topic(
    db: &State<DatabaseConnection>,
    user: AuthUser,
    topic_id: &str,
) -> AppResult<Json<TopicResponse>> {
    let topic_uuid = Uuid::parse_str(topic_id)
        .map_err(|_| AppError::BadRequest("Invalid topic ID format".to_string()))?;
    let topic = get_topic_by_id(db, user.id, topic_uuid).await?;
    Ok(Json(topic))
}

#[post("/", data = "<request>")]
pub async fn create_topic_route(
    db: &State<DatabaseConnection>,
    user: AuthUser,
    request: Json<CreateTopicRequest>,
) -> AppResult<Json<TopicResponse>> {
    let topic = create_topic(db, user.id, request.into_inner()).await?;
    Ok(Json(topic))
}

#[put("/<topic_id>", data = "<request>")]
pub async fn update_topic_route(
    db: &State<DatabaseConnection>,
    user: AuthUser,
    topic_id: &str,
    request: Json<UpdateTopicRequest>,
) -> AppResult<Json<TopicResponse>> {
    let topic_uuid = Uuid::parse_str(topic_id)
        .map_err(|_| AppError::BadRequest("Invalid topic ID format".to_string()))?;
    let topic = update_topic(db, user.id, topic_uuid, request.into_inner()).await?;
    Ok(Json(topic))
}

#[delete("/<topic_id>")]
pub async fn delete_topic_route(
    db: &State<DatabaseConnection>,
    user: AuthUser,
    topic_id: &str,
) -> AppResult<Json<bool>> {
    let topic_uuid = Uuid::parse_str(topic_id)
        .map_err(|_| AppError::BadRequest("Invalid topic ID format".to_string()))?;
    let result = delete_topic(db, user.id, topic_uuid).await?;
    Ok(Json(result))
}
