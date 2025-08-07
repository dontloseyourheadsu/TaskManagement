use crate::errors::{AppError, AppResult};
use mobc::{Connection, Pool};
use mobc_redis::RedisConnectionManager;
use mobc_redis::redis::{Client, AsyncCommands};
use serde::{de::DeserializeOwned, Serialize};
use std::ops::DerefMut;
use std::time::Duration;

pub type RedisPool = Pool<RedisConnectionManager>;
pub type RedisConnection = Connection<RedisConnectionManager>;

pub struct Cache {
    pool: RedisPool,
    default_ttl: u64,
}

impl Cache {
    pub fn new(redis_url: &str, default_ttl: u64) -> AppResult<Self> {
        let client = Client::open(redis_url)
            .map_err(|e| AppError::Internal(format!("Failed to create Redis client: {}", e)))?;
            
        let manager = RedisConnectionManager::new(client);
            
        let pool = Pool::builder()
            .max_open(20)
            .max_idle(8)
            .get_timeout(Some(Duration::from_secs(5)))
            .build(manager);

        Ok(Cache {
            pool,
            default_ttl,
        })
    }

    pub async fn get_connection(&self) -> AppResult<RedisConnection> {
        self.pool
            .get()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to get Redis connection: {}", e)))
    }

    pub async fn get<T>(&self, key: &str) -> AppResult<Option<T>>
    where
        T: DeserializeOwned,
    {
        let mut conn = self.get_connection().await?;
        
        let result: Option<String> = conn.deref_mut()
            .get(key)
            .await
            .map_err(|e| AppError::Internal(format!("Redis get error: {}", e)))?;

        match result {
            Some(json_str) => {
                let value: T = serde_json::from_str(&json_str)
                    .map_err(|e| AppError::Internal(format!("Failed to deserialize cached value: {}", e)))?;
                Ok(Some(value))
            }
            None => Ok(None),
        }
    }

    pub async fn set<T>(&self, key: &str, value: &T) -> AppResult<()>
    where
        T: Serialize,
    {
        self.set_with_ttl(key, value, self.default_ttl).await
    }

    pub async fn set_with_ttl<T>(&self, key: &str, value: &T, ttl_seconds: u64) -> AppResult<()>
    where
        T: Serialize,
    {
        let mut conn = self.get_connection().await?;
        
        let json_str = serde_json::to_string(value)
            .map_err(|e| AppError::Internal(format!("Failed to serialize value: {}", e)))?;

        conn.deref_mut().set_ex(key, json_str, ttl_seconds as usize)
            .await
            .map_err(|e| AppError::Internal(format!("Redis set error: {}", e)))?;

        Ok(())
    }

    pub async fn delete(&self, key: &str) -> AppResult<bool> {
        let mut conn = self.get_connection().await?;
        
        let result: i32 = conn.deref_mut()
            .del(key)
            .await
            .map_err(|e| AppError::Internal(format!("Redis delete error: {}", e)))?;

        Ok(result > 0)
    }

    pub async fn exists(&self, key: &str) -> AppResult<bool> {
        let mut conn = self.get_connection().await?;
        
        let result: bool = conn
            .exists(key)
            .await
            .map_err(|e| AppError::Internal(format!("Redis exists error: {}", e)))?;

        Ok(result)
    }

    pub fn generate_cache_key(&self, prefix: &str, user_id: &uuid::Uuid, suffix: Option<&str>) -> String {
        match suffix {
            Some(s) => format!("{}:{}:{}", prefix, user_id, s),
            None => format!("{}:{}", prefix, user_id),
        }
    }
}

// Cache key constants
pub mod keys {
    pub const TASKS: &str = "tasks";
    pub const SUBSTEPS: &str = "substeps";
}
