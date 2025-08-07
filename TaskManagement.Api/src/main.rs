#[macro_use] extern crate rocket;

mod auth;
mod config;
mod database;
mod errors;
mod models;
mod routes;
mod schemas;

use config::Config;
use database::{create_topic, create_user, CreateTopicRequest, CreateUserRequest};
use rocket::serde::json::Json;
use rocket::serde::{Deserialize, Serialize};
use rocket::{routes};
use rocket_cors::{AllowedOrigins, CorsOptions};
use sea_orm::{Database, DatabaseConnection};

#[derive(Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
struct PingResponse {
    message: String,
    status: String,
}

#[get("/")]
fn index() -> &'static str {
    "Task Management API - Rust Rocket Backend"
}

#[get("/ping")]
fn ping() -> Json<PingResponse> {
    Json(PingResponse {
        message: "pong".to_string(),
        status: "healthy".to_string(),
    })
}

async fn setup_database(db: &DatabaseConnection, config: &Config) -> Result<(), Box<dyn std::error::Error>> {
    // For now, we'll handle schema creation manually
    // In production, you would want to use proper migrations
    
    // Create demo user and topic
    let demo_user_request = CreateUserRequest {
        email: "demo@taskmanagement.com".to_string(),
        username: "demo_user".to_string(),
        password: "demo123".to_string(),
    };

    // Check if demo user already exists
    match database::get_user_by_email(db, &demo_user_request.email).await {
        Ok(_) => {
            println!("Demo user already exists");
        }
        Err(_) => {
            // Create demo user
            let demo_user = create_user(db, config, demo_user_request).await?;
            println!("Created demo user: {}", demo_user.email);

            // Create default topic for demo user
            let default_topic_request = CreateTopicRequest {
                name: "General".to_string(),
                description: Some("Default topic for general tasks".to_string()),
                color: "#673ab7".to_string(),
            };

            let _default_topic = create_topic(db, demo_user.id, default_topic_request).await?;
            println!("Created default topic for demo user");
        }
    }

    Ok(())
}

#[launch]
async fn rocket() -> _ {
    // Load configuration
    let config = Config::from_env().expect("Failed to load configuration");
    
    // Connect to database
    let db = Database::connect(&config.database_url)
        .await
        .expect("Failed to connect to database");

    // Setup database (migrations and demo data)
    setup_database(&db, &config)
        .await
        .expect("Failed to setup database");

    // Configure CORS
    let cors = CorsOptions::default()
        .allowed_origins(AllowedOrigins::some_exact(&[
            "http://localhost:4200", // Angular dev server
            "http://127.0.0.1:4200",
            "http://localhost:3000", // Alternative frontend ports
            "http://127.0.0.1:3000"
        ]))
        .allowed_methods(
            vec![
                rocket::http::Method::Get,
                rocket::http::Method::Post,
                rocket::http::Method::Put,
                rocket::http::Method::Delete,
                rocket::http::Method::Options,
            ].into_iter().map(From::from).collect()
        )
        .allowed_headers(rocket_cors::AllowedHeaders::All)
        .allow_credentials(true)
        .to_cors()
        .expect("Failed to create CORS fairing");

    rocket::build()
        .manage(db)
        .manage(config)
        .attach(cors)
        .mount("/", routes![index, ping])
        .mount("/api/auth", routes![
            routes::login,
            routes::register,
            routes::get_current_user
        ])
        .mount("/api/topics", routes![
            routes::get_topics,
            routes::get_topic,
            routes::create_topic_route,
            routes::update_topic_route,
            routes::delete_topic_route
        ])
        .mount("/api/tasks", routes![
            routes::get_tasks,
            routes::get_task,
            routes::create_task_route,
            routes::update_task_route,
            routes::delete_task_route,
            routes::get_task_substeps,
            routes::create_task_substep
        ])
        .mount("/api/substeps", routes![
            routes::get_substep,
            routes::update_substep_route,
            routes::delete_substep_route
        ])
}
