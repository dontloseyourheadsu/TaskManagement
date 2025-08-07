use rocket::response::{self, Responder};
use rocket::{Request, Response};
use serde::{Deserialize, Serialize};
use std::io::Cursor;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sea_orm::DbErr),
    
    #[error("Authentication error: {0}")]
    Auth(String),
    
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Unauthorized: {0}")]
    Unauthorized(String),
    
    #[error("Forbidden: {0}")]
    Forbidden(String),
    
    #[error("Bad request: {0}")]
    BadRequest(String),
    
    #[error("Internal server error: {0}")]
    Internal(String),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
    pub code: u16,
}

impl<'r> Responder<'r, 'static> for AppError {
    fn respond_to(self, _: &'r Request<'_>) -> response::Result<'static> {
        let (status, error_type, message) = match &self {
            AppError::Database(_) => (rocket::http::Status::InternalServerError, "database_error", self.to_string()),
            AppError::Auth(_) => (rocket::http::Status::Unauthorized, "auth_error", self.to_string()),
            AppError::Validation(_) => (rocket::http::Status::BadRequest, "validation_error", self.to_string()),
            AppError::NotFound(_) => (rocket::http::Status::NotFound, "not_found", self.to_string()),
            AppError::Unauthorized(_) => (rocket::http::Status::Unauthorized, "unauthorized", self.to_string()),
            AppError::Forbidden(_) => (rocket::http::Status::Forbidden, "forbidden", self.to_string()),
            AppError::BadRequest(_) => (rocket::http::Status::BadRequest, "bad_request", self.to_string()),
            AppError::Internal(_) => (rocket::http::Status::InternalServerError, "internal_error", self.to_string()),
        };

        let error_response = ErrorResponse {
            error: error_type.to_string(),
            message,
            code: status.code,
        };

        let json = serde_json::to_string(&error_response).unwrap();
        
        Response::build()
            .status(status)
            .header(rocket::http::ContentType::JSON)
            .sized_body(json.len(), Cursor::new(json))
            .ok()
    }
}

pub type AppResult<T> = Result<T, AppError>;
