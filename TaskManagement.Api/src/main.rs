#[macro_use] extern crate rocket;

use rocket::serde::json::Json;
use rocket::serde::{Deserialize, Serialize};

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

#[launch]
fn rocket() -> _ {
    rocket::build()
        .mount("/", routes![index])
        .mount("/api", routes![ping])
}
