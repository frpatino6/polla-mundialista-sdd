using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using Mediator;
using HttpResult = Microsoft.AspNetCore.Http.IResult;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using PollaMundialista.Application;
using PollaMundialista.Application.Abstractions;
using PollaMundialista.Application.Common;
using PollaMundialista.Application.Dtos;
using PollaMundialista.Application.Enums;
using PollaMundialista.Application.Leaderboard;
using PollaMundialista.Application.Matches;
using PollaMundialista.Application.Predictions;
using PollaMundialista.Domain.Enums;
using PollaMundialista.Infrastructure;
using PollaMundialista.Infrastructure.Security;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

var jwtOptions = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Secret)),
            ValidateLifetime = true
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapGet("/", () => "Hello World!");

app.MapGet("/api/matches", async (IMatchRepository matchRepository, CancellationToken ct) =>
{
    var matches = await matchRepository.GetAllAsync(ct);

    var dtos = matches.Select(match => new MatchDto(
        match.Id,
        match.Group,
        match.HomeTeam,
        match.AwayTeam,
        match.KickoffAt,
        match.Result?.HomeScore,
        match.Result?.AwayScore));

    return Results.Ok(dtos);
}).RequireAuthorization();

app.MapPost("/api/predictions", async (PredictionRequest request, HttpContext httpContext, IMediator mediator, CancellationToken ct) =>
{
    var userId = Guid.Parse(httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    var command = new RegisterPredictionCommand(
        userId,
        request.MatchId,
        request.PredictedHomeScore,
        request.PredictedAwayScore);

    var result = await mediator.Send(command, ct);

    return ToHttpResult(result);
}).RequireAuthorization();

app.MapPut("/api/admin/matches/{matchId:guid}/result", async (Guid matchId, MatchResultRequest request, IMediator mediator, CancellationToken ct) =>
{
    var submitResult = await mediator.Send(new SubmitMatchResultCommand(matchId, request.HomeScore, request.AwayScore), ct);
    if (!submitResult.IsSuccess)
        return ToHttpResult(submitResult);

    var recalculateResult = await mediator.Send(new RecalculateScoresCommand(matchId), ct);
    if (!recalculateResult.IsSuccess)
        return ToHttpResult(recalculateResult);

    return Results.Ok(submitResult.Value);
}).RequireAuthorization(policy => policy.RequireRole(nameof(UserRole.Admin)));

app.MapGet("/api/leaderboard", async (IMediator mediator, CancellationToken ct) =>
{
    var result = await mediator.Send(new GetLeaderboardQuery(), ct);
    return Results.Ok(result.Value);
}).RequireAuthorization();

app.Run();

static HttpResult ToHttpResult<T>(Result<T> result)
{
    if (result.IsSuccess)
        return Results.Ok(result.Value);

    return result.Error switch
    {
        ResultError.NotFound => Results.NotFound(new { message = result.ErrorMessage }),
        ResultError.Conflict => Results.Conflict(new { message = result.ErrorMessage }),
        ResultError.Validation => Results.BadRequest(new { message = result.ErrorMessage }),
        ResultError.Unauthorized => Results.Json(new { message = result.ErrorMessage }, statusCode: 401),
        _ => Results.BadRequest(new { message = result.ErrorMessage })
    };
}

public partial class Program { }

public record PredictionRequest(Guid MatchId, int PredictedHomeScore, int PredictedAwayScore);

public record MatchResultRequest(int HomeScore, int AwayScore);
