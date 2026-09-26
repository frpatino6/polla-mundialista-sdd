using PollaMundialista.Application.Enums;

namespace PollaMundialista.Application.Common;

public interface IResult
{
    bool IsSuccess { get; }
    ResultError Error { get; }
    string? ErrorMessage { get; }
}

public interface IResult<TSelf> : IResult where TSelf : IResult<TSelf>
{
    static abstract TSelf Failure(ResultError error, string errorMessage);
}
