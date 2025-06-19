using System;
using System.Threading.Tasks;

namespace TaskManagement.Core.Common
{
    public static class ResultExtensions
    {
        public static Result<TOut> Map<TIn, TOut>(this Result<TIn> result, Func<TIn, TOut> mapper)
        {
            if (!result.IsSuccess)
                return Result.Failure<TOut>(result.ErrorMessages);

            try
            {
                return Result.Success(mapper(result.Value));
            }
            catch (Exception ex)
            {
                return Result.Failure<TOut>($"Error mapping result: {ex.Message}");
            }
        }

        public static async Task<Result<TOut>> MapAsync<TIn, TOut>(this Task<Result<TIn>> resultTask, Func<TIn, TOut> mapper)
        {
            var result = await resultTask;
            return result.Map(mapper);
        }

        public static Result<TOut> Bind<TIn, TOut>(this Result<TIn> result, Func<TIn, Result<TOut>> binder)
        {
            if (!result.IsSuccess)
                return Result.Failure<TOut>(result.ErrorMessages);

            try
            {
                return binder(result.Value);
            }
            catch (Exception ex)
            {
                return Result.Failure<TOut>($"Error binding result: {ex.Message}");
            }
        }

        public static async Task<Result<TOut>> BindAsync<TIn, TOut>(this Task<Result<TIn>> resultTask, Func<TIn, Result<TOut>> binder)
        {
            var result = await resultTask;
            return result.Bind(binder);
        }

        public static async Task<Result<TOut>> BindAsync<TIn, TOut>(this Task<Result<TIn>> resultTask, Func<TIn, Task<Result<TOut>>> binder)
        {
            var result = await resultTask;

            if (!result.IsSuccess)
                return Result.Failure<TOut>(result.ErrorMessages);

            try
            {
                return await binder(result.Value);
            }
            catch (Exception ex)
            {
                return Result.Failure<TOut>($"Error binding result: {ex.Message}");
            }
        }

        public static Result OnSuccess(this Result result, Action action)
        {
            if (result.IsSuccess)
            {
                action();
            }
            return result;
        }

        public static Result<T> OnSuccess<T>(this Result<T> result, Action<T> action)
        {
            if (result.IsSuccess)
            {
                action(result.Value);
            }
            return result;
        }

        public static Result OnFailure(this Result result, Action<IEnumerable<string>> action)
        {
            if (!result.IsSuccess)
            {
                action(result.ErrorMessages);
            }
            return result;
        }

        public static Result<T> OnFailure<T>(this Result<T> result, Action<IEnumerable<string>> action)
        {
            if (!result.IsSuccess)
            {
                action(result.ErrorMessages);
            }
            return result;
        }
    }
}
