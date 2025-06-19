using System.Collections.Generic;

namespace TaskManagement.Core.Common
{
    public class Result
    {
        public bool IsSuccess { get; protected set; }
        public List<string> ErrorMessages { get; } = new List<string>();

        public static Result Success()
        {
            return new Result { IsSuccess = true };
        }

        public static Result Failure(params string[] errors)
        {
            var result = new Result { IsSuccess = false };
            result.ErrorMessages.AddRange(errors);
            return result;
        }

        public static Result Failure(IEnumerable<string> errors)
        {
            var result = new Result { IsSuccess = false };
            result.ErrorMessages.AddRange(errors);
            return result;
        }

        public static Result<T> Success<T>(T value)
        {
            return new Result<T> { IsSuccess = true, Value = value };
        }

        public static Result<T> Failure<T>(params string[] errors)
        {
            var result = new Result<T> { IsSuccess = false };
            result.ErrorMessages.AddRange(errors);
            return result;
        }

        public static Result<T> Failure<T>(IEnumerable<string> errors)
        {
            var result = new Result<T> { IsSuccess = false };
            result.ErrorMessages.AddRange(errors);
            return result;
        }
    }

    public class Result<T> : Result
    {
        public T Value { get; set; }
    }
}
