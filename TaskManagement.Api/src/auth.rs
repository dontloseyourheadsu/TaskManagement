use crate::config::Config;
use crate::errors::{AppError, AppResult};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, TokenData, Validation};
use rocket::http::Status;
use rocket::request::{FromRequest, Outcome, Request};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // user id
    pub email: String,
    pub username: String,
    pub exp: i64, // expiration time
    pub iat: i64, // issued at
}

#[derive(Debug)]
pub struct AuthUser {
    pub id: Uuid,
    pub email: String,
    pub username: String,
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for AuthUser {
    type Error = AppError;

    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        let config = match request.rocket().state::<Config>() {
            Some(config) => config,
            None => return Outcome::Error((Status::InternalServerError, AppError::Internal("Missing config".to_string()))),
        };

        let auth_header = match request.headers().get_one("Authorization") {
            Some(header) => header,
            None => return Outcome::Error((Status::Unauthorized, AppError::Unauthorized("Missing Authorization header".to_string()))),
        };

        let token = match auth_header.strip_prefix("Bearer ") {
            Some(token) => token,
            None => return Outcome::Error((Status::Unauthorized, AppError::Unauthorized("Invalid Authorization header format".to_string()))),
        };

        match verify_jwt(token, &config.jwt_secret) {
            Ok(claims) => {
                let user_id = match Uuid::parse_str(&claims.sub) {
                    Ok(id) => id,
                    Err(_) => return Outcome::Error((Status::Unauthorized, AppError::Unauthorized("Invalid user ID in token".to_string()))),
                };

                Outcome::Success(AuthUser {
                    id: user_id,
                    email: claims.email,
                    username: claims.username,
                })
            }
            Err(err) => Outcome::Error((Status::Unauthorized, err)),
        }
    }
}

pub fn hash_password(password: &str, cost: Option<u32>) -> AppResult<String> {
    let cost = cost.unwrap_or(DEFAULT_COST);
    hash(password, cost).map_err(|_| AppError::Internal("Failed to hash password".to_string()))
}

pub fn verify_password(password: &str, hash: &str) -> bool {
    verify(password, hash).unwrap_or(false)
}

pub fn create_jwt(user_id: Uuid, email: &str, username: &str, secret: &str, expiration_hours: u64) -> AppResult<String> {
    let now = Utc::now();
    let expiration = now + Duration::hours(expiration_hours as i64);

    let claims = Claims {
        sub: user_id.to_string(),
        email: email.to_string(),
        username: username.to_string(),
        exp: expiration.timestamp(),
        iat: now.timestamp(),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_ref()),
    )
    .map_err(|_| AppError::Internal("Failed to create JWT".to_string()))
}

pub fn verify_jwt(token: &str, secret: &str) -> AppResult<Claims> {
    let validation = Validation::default();
    
    let token_data: TokenData<Claims> = decode(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &validation,
    )
    .map_err(|_| AppError::Unauthorized("Invalid or expired token".to_string()))?;

    Ok(token_data.claims)
}
