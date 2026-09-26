using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace PollaMundialista.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialMatchSeed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Matches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Group = table.Column<string>(type: "text", nullable: false),
                    HomeTeam = table.Column<string>(type: "text", nullable: false),
                    AwayTeam = table.Column<string>(type: "text", nullable: false),
                    KickoffAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Matches", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Predictions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    MatchId = table.Column<Guid>(type: "uuid", nullable: false),
                    PredictedHomeScore = table.Column<int>(type: "integer", nullable: false),
                    PredictedAwayScore = table.Column<int>(type: "integer", nullable: false),
                    PointsAwarded = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Predictions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    Role = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MatchResults",
                columns: table => new
                {
                    MatchId = table.Column<Guid>(type: "uuid", nullable: false),
                    HomeScore = table.Column<int>(type: "integer", nullable: false),
                    AwayScore = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MatchResults", x => x.MatchId);
                    table.ForeignKey(
                        name: "FK_MatchResults_Matches_MatchId",
                        column: x => x.MatchId,
                        principalTable: "Matches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Matches",
                columns: new[] { "Id", "AwayTeam", "Group", "HomeTeam", "KickoffAt" },
                values: new object[,]
                {
                    { new Guid("47d0761e-3a4a-5429-f7e1-d60ca7d6494b"), "Portugal", "B", "Alemania", new DateTimeOffset(new DateTime(2026, 12, 5, 20, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) },
                    { new Guid("5d3b7c04-e290-aebc-b98c-07022c34e334"), "España", "A", "Argentina", new DateTimeOffset(new DateTime(2026, 12, 9, 16, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) },
                    { new Guid("5f206830-7950-e02c-c808-b5fbf450fc51"), "Portugal", "B", "Inglaterra", new DateTimeOffset(new DateTime(2026, 12, 14, 20, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) },
                    { new Guid("66690444-625a-d208-23a3-a968fc127a83"), "Alemania", "B", "Países Bajos", new DateTimeOffset(new DateTime(2026, 12, 13, 20, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) },
                    { new Guid("9807967c-d6a0-adb7-1091-0d7275ea77a4"), "Inglaterra", "B", "Alemania", new DateTimeOffset(new DateTime(2026, 12, 9, 20, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) },
                    { new Guid("ab388da8-53a5-1c25-b7ab-00e8b6deb9e2"), "Países Bajos", "B", "Portugal", new DateTimeOffset(new DateTime(2026, 12, 10, 20, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) },
                    { new Guid("ad7b296e-4660-d254-15bf-cf99993f2a4a"), "Países Bajos", "B", "Inglaterra", new DateTimeOffset(new DateTime(2026, 12, 6, 20, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) },
                    { new Guid("bcde8fa0-b37a-0d9c-f759-77641a3c8332"), "Francia", "A", "España", new DateTimeOffset(new DateTime(2026, 12, 6, 16, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) },
                    { new Guid("c731b970-5dd4-9e19-9738-fecca2baf32c"), "España", "A", "Brasil", new DateTimeOffset(new DateTime(2026, 12, 14, 16, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) },
                    { new Guid("cddf495c-7384-f230-1152-e0d690061d0f"), "Argentina", "A", "Francia", new DateTimeOffset(new DateTime(2026, 12, 13, 16, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) },
                    { new Guid("e32723a0-f845-5e32-2acd-b4006d87b053"), "Brasil", "A", "Argentina", new DateTimeOffset(new DateTime(2026, 12, 5, 16, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) },
                    { new Guid("e6c273b0-b176-f6c0-6882-8090996f1891"), "Francia", "A", "Brasil", new DateTimeOffset(new DateTime(2026, 12, 10, 16, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)) }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Predictions_UserId_MatchId",
                table: "Predictions",
                columns: new[] { "UserId", "MatchId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MatchResults");

            migrationBuilder.DropTable(
                name: "Predictions");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Matches");
        }
    }
}
