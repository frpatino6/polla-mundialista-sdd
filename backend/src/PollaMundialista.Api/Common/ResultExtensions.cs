using Microsoft.AspNetCore.Mvc;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Enums;

namespace PollaMundialista.Api.Common;

public static class ResultExtensions
{
    public static IActionResult ToActionResult<T>(this Result<T> result)
    {
        if (result.IsSuccess)
            return new OkObjectResult(result.Value);

        return result.Error switch
        {
            ResultError.NotFound => new NotFoundObjectResult(new { message = result.ErrorMessage }),
            ResultError.Conflict => new ConflictObjectResult(new { message = result.ErrorMessage }),
            ResultError.Validation => new BadRequestObjectResult(new { message = result.ErrorMessage }),
            ResultError.Unauthorized => new UnauthorizedObjectResult(new { message = result.ErrorMessage }),
            _ => new BadRequestObjectResult(new { message = result.ErrorMessage })
        };
    }
}
