using System.Net.Http;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorPages();

// Add CORS for API communication
builder.Services.AddCors(options =>
{
    options.AddPolicy("ApiCorsPolicy", builder =>
    {
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});

// Add API proxy for forwarding requests to the API service
builder.Services.AddHttpClient("TaskAPI", client =>
{
    var apiUrl = builder.Configuration["ApiUrl"] ?? "https://localhost:7001";
    client.BaseAddress = new Uri(apiUrl);
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();
app.UseCors("ApiCorsPolicy");

app.UseAuthorization();

// Configure API proxy for /api/* paths
app.MapGet("/api/{**catch-all}", async (HttpContext httpContext, IHttpClientFactory httpClientFactory) =>
{
    var client = httpClientFactory.CreateClient("TaskAPI");
    var requestPath = httpContext.Request.Path.Value?.Replace("/api", "");
    var queryString = httpContext.Request.QueryString.Value;
    var apiResponse = await client.GetAsync($"/api{requestPath}{queryString}");

    httpContext.Response.StatusCode = (int)apiResponse.StatusCode;

    // Copy all response headers
    foreach (var header in apiResponse.Headers)
    {
        if (!header.Key.Equals("Transfer-Encoding", StringComparison.OrdinalIgnoreCase))
        {
            httpContext.Response.Headers[header.Key] = header.Value.ToArray();
        }
    }

    // Copy content headers (including Content-Type)
    foreach (var header in apiResponse.Content.Headers)
    {
        httpContext.Response.Headers[header.Key] = header.Value.ToArray();
    }

    await apiResponse.Content.CopyToAsync(httpContext.Response.Body);
});

app.MapPost("/api/{**catch-all}", async (HttpContext httpContext, IHttpClientFactory httpClientFactory) =>
{
    var client = httpClientFactory.CreateClient("TaskAPI");
    var requestPath = httpContext.Request.Path.Value?.Replace("/api", "");
    var stream = new MemoryStream();
    await httpContext.Request.Body.CopyToAsync(stream);
    stream.Position = 0;

    var content = new StreamContent(stream);
    foreach (var header in httpContext.Request.Headers)
    {
        if (header.Key.StartsWith("Content-"))
        {
            content.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
        }
    }

    var apiResponse = await client.PostAsync($"/api{requestPath}", content);

    httpContext.Response.StatusCode = (int)apiResponse.StatusCode;

    // Copy all response headers
    foreach (var header in apiResponse.Headers)
    {
        if (!header.Key.Equals("Transfer-Encoding", StringComparison.OrdinalIgnoreCase))
        {
            httpContext.Response.Headers[header.Key] = header.Value.ToArray();
        }
    }

    // Copy content headers (including Content-Type)
    foreach (var header in apiResponse.Content.Headers)
    {
        httpContext.Response.Headers[header.Key] = header.Value.ToArray();
    }

    await apiResponse.Content.CopyToAsync(httpContext.Response.Body);
});

app.MapPut("/api/{**catch-all}", async (HttpContext httpContext, IHttpClientFactory httpClientFactory) =>
{
    var client = httpClientFactory.CreateClient("TaskAPI");
    var requestPath = httpContext.Request.Path.Value?.Replace("/api", "");
    var stream = new MemoryStream();
    await httpContext.Request.Body.CopyToAsync(stream);
    stream.Position = 0;

    var content = new StreamContent(stream);
    foreach (var header in httpContext.Request.Headers)
    {
        if (header.Key.StartsWith("Content-"))
        {
            content.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
        }
    }

    var apiResponse = await client.PutAsync($"/api{requestPath}", content);

    httpContext.Response.StatusCode = (int)apiResponse.StatusCode;

    // Copy all response headers
    foreach (var header in apiResponse.Headers)
    {
        if (!header.Key.Equals("Transfer-Encoding", StringComparison.OrdinalIgnoreCase))
        {
            httpContext.Response.Headers[header.Key] = header.Value.ToArray();
        }
    }

    // Copy content headers (including Content-Type)
    foreach (var header in apiResponse.Content.Headers)
    {
        httpContext.Response.Headers[header.Key] = header.Value.ToArray();
    }

    await apiResponse.Content.CopyToAsync(httpContext.Response.Body);
});

app.MapDelete("/api/{**catch-all}", async (HttpContext httpContext, IHttpClientFactory httpClientFactory) =>
{
    var client = httpClientFactory.CreateClient("TaskAPI");
    var requestPath = httpContext.Request.Path.Value?.Replace("/api", "");
    var apiResponse = await client.DeleteAsync($"/api{requestPath}");

    httpContext.Response.StatusCode = (int)apiResponse.StatusCode;

    // Copy all response headers
    foreach (var header in apiResponse.Headers)
    {
        if (!header.Key.Equals("Transfer-Encoding", StringComparison.OrdinalIgnoreCase))
        {
            httpContext.Response.Headers[header.Key] = header.Value.ToArray();
        }
    }

    // Copy content headers (including Content-Type)
    foreach (var header in apiResponse.Content.Headers)
    {
        httpContext.Response.Headers[header.Key] = header.Value.ToArray();
    }

    await apiResponse.Content.CopyToAsync(httpContext.Response.Body);
});

app.MapPatch("/api/{**catch-all}", async (HttpContext httpContext, IHttpClientFactory httpClientFactory) =>
{
    var client = httpClientFactory.CreateClient("TaskAPI");
    var requestPath = httpContext.Request.Path.Value?.Replace("/api", "");
    var stream = new MemoryStream();
    await httpContext.Request.Body.CopyToAsync(stream);
    stream.Position = 0;

    var content = new StreamContent(stream);
    foreach (var header in httpContext.Request.Headers)
    {
        if (header.Key.StartsWith("Content-"))
        {
            content.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
        }
    }

    var baseAddress = client.BaseAddress ?? new Uri("http://api:80");
    var requestMessage = new HttpRequestMessage
    {
        Method = new HttpMethod("PATCH"),
        RequestUri = new Uri(baseAddress, $"/api{requestPath}"),
        Content = content
    };

    var apiResponse = await client.SendAsync(requestMessage);

    httpContext.Response.StatusCode = (int)apiResponse.StatusCode;

    // Copy all response headers
    foreach (var header in apiResponse.Headers)
    {
        if (!header.Key.Equals("Transfer-Encoding", StringComparison.OrdinalIgnoreCase))
        {
            httpContext.Response.Headers[header.Key] = header.Value.ToArray();
        }
    }

    // Copy content headers (including Content-Type)
    foreach (var header in apiResponse.Content.Headers)
    {
        httpContext.Response.Headers[header.Key] = header.Value.ToArray();
    }

    await apiResponse.Content.CopyToAsync(httpContext.Response.Body);
});

// Set up regular Razor Pages routing with a single route pattern
app.MapFallbackToPage("{*path:nonfile}", "/Index");

app.Run();
