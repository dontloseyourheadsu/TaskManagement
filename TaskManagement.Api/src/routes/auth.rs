use crate::auth::{create_jwt, AuthUser};
use crate::config::Config;
use crate::database::{authenticate_user, create_user, get_user_by_id, CreateUserRequest};
use crate::errors::AppResult;
use rocket::serde::json::Json;
use rocket::{post, get, State};
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: crate::database::UserResponse,
}

#[post("/login", data = "<request>")]
pub async fn login(
    db: &State<DatabaseConnection>,
    config: &State<Config>,
    request: Json<LoginRequest>,
) -> AppResult<Json<AuthResponse>> {
    let user = authenticate_user(db, &request.email, &request.password).await?;
    
    let token = create_jwt(
        user.id,
        &user.email,
        &user.username,
        &config.jwt_secret,
        config.jwt_expiration_hours,
    )?;

    let user_response = crate::database::UserResponse::from(user);

    Ok(Json(AuthResponse {
        token,
        user: user_response,
    }))
}

#[post("/register", data = "<request>")]
pub async fn register(
    db: &State<DatabaseConnection>,
    config: &State<Config>,
    request: Json<RegisterRequest>,
) -> AppResult<Json<AuthResponse>> {
    let create_request = CreateUserRequest {
        email: request.email.clone(),
        username: request.username.clone(),
        password: request.password.clone(),
    };

    let user_response = create_user(db, config, create_request).await?;
    
    let token = create_jwt(
        user_response.id,
        &user_response.email,
        &user_response.username,
        &config.jwt_secret,
        config.jwt_expiration_hours,
    )?;

    Ok(Json(AuthResponse {
        token,
        user: user_response,
    }))
}

#[get("/me")]
pub async fn get_current_user(
    db: &State<DatabaseConnection>,
    user: AuthUser,
) -> AppResult<Json<crate::database::UserResponse>> {
    let user_response = get_user_by_id(db, user.id).await?;
    Ok(Json(user_response))
}
