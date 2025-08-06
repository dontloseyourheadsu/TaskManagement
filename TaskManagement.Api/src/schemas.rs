use sea_orm_migration::prelude::*;
use sea_orm_migration::prelude::extension::postgres::Type;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create task_type enum
        manager
            .create_type(
                Type::create()
                    .as_enum(TaskType::Table)
                    .values([
                        TaskType::Work,
                        TaskType::Personal,
                        TaskType::Meeting,
                        TaskType::Deadline,
                        TaskType::Event,
                    ])
                    .to_owned(),
            )
            .await?;

        // Create users table
        manager
            .create_table(
                Table::create()
                    .table(Users::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Users::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Users::Email)
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .col(
                        ColumnDef::new(Users::Username)
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .col(
                        ColumnDef::new(Users::PasswordHash)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Users::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Users::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Create topics table
        manager
            .create_table(
                Table::create()
                    .table(Topics::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Topics::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Topics::UserId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Topics::Name)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Topics::Description)
                            .text(),
                    )
                    .col(
                        ColumnDef::new(Topics::Color)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Topics::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Topics::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_topics_user_id")
                            .from(Topics::Table, Topics::UserId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create tasks table
        manager
            .create_table(
                Table::create()
                    .table(Tasks::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Tasks::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Tasks::TopicId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Tasks::Title)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Tasks::Description)
                            .text(),
                    )
                    .col(
                        ColumnDef::new(Tasks::StartTime)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Tasks::EndTime)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Tasks::TaskType)
                            .enumeration(TaskType::Table, [
                                TaskType::Work,
                                TaskType::Personal,
                                TaskType::Meeting,
                                TaskType::Deadline,
                                TaskType::Event,
                            ])
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Tasks::Color)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Tasks::Urgent)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(Tasks::Completed)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(Tasks::DueDate)
                            .timestamp_with_time_zone(),
                    )
                    .col(
                        ColumnDef::new(Tasks::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Tasks::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tasks_topic_id")
                            .from(Tasks::Table, Tasks::TopicId)
                            .to(Topics::Table, Topics::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Tasks::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(Topics::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(Users::Table).to_owned())
            .await?;

        manager
            .drop_type(Type::drop().name(TaskType::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum Users {
    Table,
    Id,
    Email,
    Username,
    PasswordHash,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum Topics {
    Table,
    Id,
    UserId,
    Name,
    Description,
    Color,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum Tasks {
    Table,
    Id,
    TopicId,
    Title,
    Description,
    StartTime,
    EndTime,
    TaskType,
    Color,
    Urgent,
    Completed,
    DueDate,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum TaskType {
    Table,
    Work,
    Personal,
    Meeting,
    Deadline,
    Event,
}
