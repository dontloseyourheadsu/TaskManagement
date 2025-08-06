use crate::auth::{hash_password, verify_password};
use crate::config::Config;
use crate::errors::{AppError, AppResult};
use crate::models::user::{self, Entity as User};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateUserRequest {
    pub email: String,
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateUserRequest {
    pub email: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub username: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl From<user::Model> for UserResponse {
    fn from(user: user::Model) -> Self {
        Self {
            id: user.id,
            email: user.email,
            username: user.username,
            created_at: user.created_at,
        }
    }
}

pub async fn create_user(
    db: &DatabaseConnection,
    config: &Config,
    request: CreateUserRequest,
) -> AppResult<UserResponse> {
    // Check if email or username already exists
    let existing_user = User::find()
        .filter(
            user::Column::Email
                .eq(&request.email)
                .or(user::Column::Username.eq(&request.username))
        )
        .one(db)
        .await?;

    if existing_user.is_some() {
        return Err(AppError::BadRequest("Email or username already exists".to_string()));
    }

    let password_hash = hash_password(&request.password, Some(config.bcrypt_cost))?;

    let user = user::ActiveModel {
        email: Set(request.email),
        username: Set(request.username),
        password_hash: Set(password_hash),
        ..Default::default()
    };

    let user = user.insert(db).await?;
    Ok(UserResponse::from(user))
}

pub async fn get_user_by_id(db: &DatabaseConnection, user_id: Uuid) -> AppResult<UserResponse> {
    let user = User::find_by_id(user_id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    Ok(UserResponse::from(user))
}

pub async fn get_user_by_email(db: &DatabaseConnection, email: &str) -> AppResult<user::Model> {
    User::find()
        .filter(user::Column::Email.eq(email))
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))
}

pub async fn authenticate_user(
    db: &DatabaseConnection,
    email: &str,
    password: &str,
) -> AppResult<user::Model> {
    let user = get_user_by_email(db, email).await?;

    if verify_password(password, &user.password_hash) {
        Ok(user)
    } else {
        Err(AppError::Unauthorized("Invalid credentials".to_string()))
    }
}

pub async fn update_user(
    db: &DatabaseConnection,
    config: &Config,
    user_id: Uuid,
    request: UpdateUserRequest,
) -> AppResult<UserResponse> {
    let user = User::find_by_id(user_id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    let mut user: user::ActiveModel = user.into();

    if let Some(email) = request.email {
        // Check if email already exists for another user
        let existing = User::find()
            .filter(user::Column::Email.eq(&email))
            .filter(user::Column::Id.ne(user_id))
            .one(db)
            .await?;

        if existing.is_some() {
            return Err(AppError::BadRequest("Email already exists".to_string()));
        }
        user.email = Set(email);
    }

    if let Some(username) = request.username {
        // Check if username already exists for another user
        let existing = User::find()
            .filter(user::Column::Username.eq(&username))
            .filter(user::Column::Id.ne(user_id))
            .one(db)
            .await?;

        if existing.is_some() {
            return Err(AppError::BadRequest("Username already exists".to_string()));
        }
        user.username = Set(username);
    }

    if let Some(password) = request.password {
        let password_hash = hash_password(&password, Some(config.bcrypt_cost))?;
        user.password_hash = Set(password_hash);
    }

    let user = user.update(db).await?;
    Ok(UserResponse::from(user))
}
