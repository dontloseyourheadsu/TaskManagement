use crate::errors::{AppError, AppResult};
use crate::models::topic::{self, Entity as Topic};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTopicRequest {
    pub name: String,
    pub description: Option<String>,
    pub color: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTopicRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TopicResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub color: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<topic::Model> for TopicResponse {
    fn from(topic: topic::Model) -> Self {
        Self {
            id: topic.id,
            user_id: topic.user_id,
            name: topic.name,
            description: topic.description,
            color: topic.color,
            created_at: topic.created_at,
            updated_at: topic.updated_at,
        }
    }
}

pub async fn create_topic(
    db: &DatabaseConnection,
    user_id: Uuid,
    request: CreateTopicRequest,
) -> AppResult<TopicResponse> {
    let topic = topic::ActiveModel {
        user_id: Set(user_id),
        name: Set(request.name),
        description: Set(request.description),
        color: Set(request.color),
        ..Default::default()
    };

    let topic = topic.insert(db).await?;
    Ok(TopicResponse::from(topic))
}

pub async fn get_topics_by_user(
    db: &DatabaseConnection,
    user_id: Uuid,
) -> AppResult<Vec<TopicResponse>> {
    let topics = Topic::find()
        .filter(topic::Column::UserId.eq(user_id))
        .order_by_asc(topic::Column::Name)
        .all(db)
        .await?;

    Ok(topics.into_iter().map(TopicResponse::from).collect())
}

pub async fn get_topic_by_id(
    db: &DatabaseConnection,
    user_id: Uuid,
    topic_id: Uuid,
) -> AppResult<TopicResponse> {
    let topic = Topic::find_by_id(topic_id)
        .filter(topic::Column::UserId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Topic not found".to_string()))?;

    Ok(TopicResponse::from(topic))
}

pub async fn update_topic(
    db: &DatabaseConnection,
    user_id: Uuid,
    topic_id: Uuid,
    request: UpdateTopicRequest,
) -> AppResult<TopicResponse> {
    let topic = Topic::find_by_id(topic_id)
        .filter(topic::Column::UserId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Topic not found".to_string()))?;

    let mut topic: topic::ActiveModel = topic.into();

    if let Some(name) = request.name {
        topic.name = Set(name);
    }

    if let Some(description) = request.description {
        topic.description = Set(Some(description));
    }

    if let Some(color) = request.color {
        topic.color = Set(color);
    }

    let topic = topic.update(db).await?;
    Ok(TopicResponse::from(topic))
}

pub async fn delete_topic(
    db: &DatabaseConnection,
    user_id: Uuid,
    topic_id: Uuid,
) -> AppResult<bool> {
    let topic = Topic::find_by_id(topic_id)
        .filter(topic::Column::UserId.eq(user_id))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("Topic not found".to_string()))?;

    Topic::delete_by_id(topic.id).exec(db).await?;
    Ok(true)
}
