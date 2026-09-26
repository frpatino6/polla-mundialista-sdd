using Microsoft.EntityFrameworkCore;
using PollaMundialista.Domain.Entities;

namespace PollaMundialista.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Match> Matches => Set<Match>();
    public DbSet<Prediction> Predictions => Set<Prediction>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
