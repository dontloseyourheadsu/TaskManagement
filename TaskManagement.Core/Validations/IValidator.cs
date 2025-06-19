using System.Collections.Generic;
using System.Linq;
using TaskManagement.Core.Common;

namespace TaskManagement.Core.Validations
{
    public interface IValidator<T>
    {
        Result Validate(T entity);
    }

    public abstract class BaseValidator<T> : IValidator<T>
    {
        public Result Validate(T entity)
        {
            var validationErrors = new List<string>();

            if (entity == null)
            {
                return Result.Failure("Entity cannot be null");
            }

            DoValidate(entity, validationErrors);

            return validationErrors.Any()
                ? Result.Failure(validationErrors)
                : Result.Success();
        }

        protected abstract void DoValidate(T entity, List<string> errors);
    }
}
