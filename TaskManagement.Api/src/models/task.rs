use sea_orm::entity::prelude::*;
use sea_orm::Set;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "Enum", enum_name = "task_type")]
#[serde(rename_all = "lowercase")]
pub enum TaskType {
    #[sea_orm(string_value = "work")]
    Work,
    #[sea_orm(string_value = "personal")]
    Personal,
    #[sea_orm(string_value = "meeting")]
    Meeting,
    #[sea_orm(string_value = "deadline")]
    Deadline,
    #[sea_orm(string_value = "event")]
    Event,
}

impl std::str::FromStr for TaskType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "work" => Ok(TaskType::Work),
            "personal" => Ok(TaskType::Personal),
            "meeting" => Ok(TaskType::Meeting),
            "deadline" => Ok(TaskType::Deadline),
            "event" => Ok(TaskType::Event),
            _ => Err(format!("Invalid task type: {}", s)),
        }
    }
}

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "tasks")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    
    pub topic_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub start_time: DateTimeUtc,
    pub end_time: DateTimeUtc,
    pub task_type: TaskType,
    pub color: String,
    pub urgent: bool,
    pub completed: bool,
    pub due_date: Option<DateTimeUtc>,
    
    pub created_at: DateTimeUtc,
    pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::topic::Entity",
        from = "Column::TopicId",
        to = "super::topic::Column::Id"
    )]
    Topic,
    
    #[sea_orm(has_many = "super::task_substep::Entity")]
    Substeps,
}

impl Related<super::topic::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Topic.def()
    }
}

impl Related<super::task_substep::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Substeps.def()
    }
}

impl ActiveModelBehavior for ActiveModel {
    fn new() -> Self {
        Self {
            id: Set(Uuid::new_v4()),
            created_at: Set(chrono::Utc::now()),
            updated_at: Set(chrono::Utc::now()),
            ..ActiveModelTrait::default()
        }
    }
}
