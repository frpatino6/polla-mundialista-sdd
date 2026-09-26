using PollaMundialista.Application.Enums;

namespace PollaMundialista.Application.Common;

public sealed class Result<T> : IResult<Result<T>>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public ResultError Error { get; }
    public string? ErrorMessage { get; }

    private Result(bool isSuccess, T? value, ResultError error, string? errorMessage)
    {
        IsSuccess = isSuccess;
        Value = value;
        Error = error;
        ErrorMessage = errorMessage;
    }

    public static Result<T> Success(T value) => new(true, value, ResultError.None, null);

    public static Result<T> Failure(ResultError error, string errorMessage) => new(false, default, error, errorMessage);
}
