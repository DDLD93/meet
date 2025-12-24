# External API Documentation

This document describes the external API for managing meetings. All endpoints require API key authentication via the `X-API-Key` header.

## Base URL


Production:
```
https://your-domain.com/api/v1
```

## Authentication

All endpoints require API key authentication. Include your API key in the `X-API-Key` header with every request.

### Header Format

```
X-API-Key: your-api-key-here
```

### Configuration

API keys are configured via environment variables:
- `API_SECRET_KEYS` - Comma-separated list of valid API keys (recommended)
- `API_SECRET_KEY` - Single API key (fallback if `API_SECRET_KEYS` is not set)

Example:
```bash
API_SECRET_KEYS=key1,key2,key3
```

### Authentication Errors

| Status Code | Error Code | Description |
|------------|------------|-------------|
| 401 | `MISSING_API_KEY` | API key header is missing |
| 401 | `INVALID_API_KEY` | API key is invalid |
| 500 | `AUTH_NOT_CONFIGURED` | API authentication is not configured on the server |

## Response Format

All successful responses follow this structure:

```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

Error responses follow this structure:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "issues": { ... }
}
```

## Endpoints

### List Meetings

Retrieve a paginated list of meetings with optional filtering.

**Endpoint:** `GET /meetings`

**Headers:**
```
X-API-Key: your-api-key
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `status` | string | No | - | Filter by status: `ACTIVE` or `ENDED` |
| `limit` | integer | No | 50 | Maximum number of results (1-200) |
| `offset` | integer | No | 0 | Number of results to skip for pagination |

**Example Request:**

```bash
curl -X GET "https://api.example.com/api/v1/meetings?status=ACTIVE&limit=10&offset=0" \
  -H "X-API-Key: your-api-key"
```

**Example Response:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Team Standup",
      "status": "ACTIVE",
      "roomName": "abc12345",
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z",
      "joinUrl": "https://app.example.com/join/abc12345",
      "messageCount": 5,
      "participants": [
        {
          "email": "john@example.com",
          "name": "John Doe"
        },
        {
          "email": "jane@example.com",
          "name": "Jane Smith"
        }
      ]
    }
  ],
  "meta": {
    "total": 25,
    "limit": 10,
    "offset": 0,
    "hasMore": true,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized - Invalid or missing API key |
| 500 | Internal server error |

---

### Create Meeting

Create a new instant meeting.

**Endpoint:** `POST /meetings`

**Headers:**
```
X-API-Key: your-api-key
Content-Type: application/json
```

**Request Body:**

```json
{
  "title": "Team Standup",
  "participants": [
    {
      "email": "john@example.com",
      "name": "John Doe"
    },
    {
      "email": "jane@example.com",
      "name": "Jane Smith"
    }
  ]
}
```

**Request Body Schema:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|------------|-------------|
| `title` | string | Yes | 1-120 characters | Meeting title |
| `participants` | array | No | - | List of participants to invite |

**Participant Object:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|------------|-------------|
| `email` | string | Yes | Valid email format | Participant email address |
| `name` | string | Yes | 1-120 characters | Participant display name |

**Example Request:**

```bash
curl -X POST "https://api.example.com/api/v1/meetings" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Team Standup",
    "participants": [
      {
        "email": "john@example.com",
        "name": "John Doe"
      }
    ]
  }'
```

**Example Response:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Team Standup",
    "status": "ACTIVE",
    "roomName": "abc12345",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z",
    "joinUrl": "https://app.example.com/join/abc12345",
    "messageCount": 0,
    "participants": [
      {
        "email": "john@example.com",
        "name": "John Doe"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

**Status Codes:**

| Code | Description |
|------|-------------|
| 201 | Meeting created successfully |
| 400 | Validation error - Invalid request body |
| 401 | Unauthorized - Invalid or missing API key |
| 500 | Internal server error |

**Validation Errors:**

The `issues` field in error responses contains detailed validation errors:

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "issues": {
    "fieldErrors": {
      "title": ["Title is required"],
      "participants[0].email": ["Invalid email format"]
    }
  }
}
```

---

### Get Meeting Details

Retrieve detailed information about a specific meeting.

**Endpoint:** `GET /meetings/{id}`

**Headers:**
```
X-API-Key: your-api-key
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Meeting identifier |

**Example Request:**

```bash
curl -X GET "https://api.example.com/api/v1/meetings/550e8400-e29b-41d4-a716-446655440000" \
  -H "X-API-Key: your-api-key"
```

**Example Response:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Team Standup",
    "status": "ACTIVE",
    "roomName": "abc12345",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z",
    "joinUrl": "https://app.example.com/join/abc12345",
    "messageCount": 5,
    "participants": [
      {
        "email": "john@example.com",
        "name": "John Doe"
      },
      {
        "email": "jane@example.com",
        "name": "Jane Smith"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized - Invalid or missing API key |
| 404 | Meeting not found |
| 500 | Internal server error |

---

### Update Meeting

Update meeting title or status.

**Endpoint:** `PATCH /meetings/{id}`

**Headers:**
```
X-API-Key: your-api-key
Content-Type: application/json
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Meeting identifier |

**Request Body:**

```json
{
  "title": "Updated Meeting Title",
  "status": "ENDED"
}
```

**Request Body Schema:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|------------|-------------|
| `title` | string | No | 1-120 characters | Meeting title |
| `status` | string | No | `ACTIVE` or `ENDED` | Meeting status |

**Note:** At least one field (`title` or `status`) must be provided.

**Example Request:**

```bash
curl -X PATCH "https://api.example.com/api/v1/meetings/550e8400-e29b-41d4-a716-446655440000" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Meeting Title",
    "status": "ENDED"
  }'
```

**Example Response:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Updated Meeting Title",
    "status": "ENDED",
    "roomName": "abc12345",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T11:00:00.000Z",
    "joinUrl": "https://app.example.com/join/abc12345",
    "messageCount": 5,
    "participants": [
      {
        "email": "john@example.com",
        "name": "John Doe"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Meeting updated successfully |
| 400 | Validation error or no fields to update |
| 401 | Unauthorized - Invalid or missing API key |
| 404 | Meeting not found |
| 500 | Internal server error |

**Error Example (No Fields to Update):**

```json
{
  "error": "No fields to update",
  "code": "NO_UPDATE_FIELDS"
}
```

---

### Delete Meeting

Soft delete a meeting by setting its status to `ENDED`.

**Endpoint:** `DELETE /meetings/{id}`

**Headers:**
```
X-API-Key: your-api-key
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Meeting identifier |

**Example Request:**

```bash
curl -X DELETE "https://api.example.com/api/v1/meetings/550e8400-e29b-41d4-a716-446655440000" \
  -H "X-API-Key: your-api-key"
```

**Example Response:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "deleted": true
  },
  "meta": {
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Meeting deleted successfully |
| 401 | Unauthorized - Invalid or missing API key |
| 404 | Meeting not found |
| 500 | Internal server error |

**Note:** This is a soft delete operation. The meeting status is set to `ENDED`, but the meeting record remains in the database.

---

## Data Models

### Meeting Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique meeting identifier |
| `title` | string | Meeting title |
| `status` | string | Meeting status: `ACTIVE` or `ENDED` |
| `roomName` | string | Unique room identifier (8 alphanumeric characters) |
| `createdAt` | string (ISO 8601) | Meeting creation timestamp |
| `updatedAt` | string (ISO 8601) | Last update timestamp |
| `joinUrl` | string (URI) | URL to join the meeting |
| `messageCount` | integer | Number of chat messages in the meeting |
| `participants` | array | List of participants |

### Participant Object

| Field | Type | Description |
|-------|------|-------------|
| `email` | string (email) | Participant email address |
| `name` | string | Participant display name |

### Pagination Meta Object

| Field | Type | Description |
|-------|------|-------------|
| `total` | integer | Total number of meetings matching the query |
| `limit` | integer | Maximum number of results per page |
| `offset` | integer | Number of results skipped |
| `hasMore` | boolean | Whether more results are available |
| `timestamp` | string (ISO 8601) | Response timestamp |

---

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `MISSING_API_KEY` | API key header is missing | 401 |
| `INVALID_API_KEY` | API key is invalid | 401 |
| `AUTH_NOT_CONFIGURED` | API authentication not configured | 500 |
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `NOT_FOUND` | Resource not found | 404 |
| `NO_UPDATE_FIELDS` | No fields provided for update | 400 |
| `INTERNAL_ERROR` | Internal server error | 500 |

---

## Rate Limiting

Currently, there are no rate limits enforced. However, we recommend implementing reasonable request rates in your client applications to avoid overwhelming the server.

---

## Best Practices

1. **Store API Keys Securely**: Never commit API keys to version control. Use environment variables or secure secret management systems.

2. **Handle Errors Gracefully**: Always check response status codes and handle errors appropriately in your application.

3. **Use Pagination**: When listing meetings, use pagination parameters (`limit` and `offset`) to avoid loading large datasets.

4. **Validate Input**: Validate request data before sending to the API to reduce unnecessary requests.

5. **Cache Responses**: Consider caching meeting details when appropriate to reduce API calls.

6. **Monitor Usage**: Keep track of your API usage to identify any issues or optimization opportunities.

---

## Examples

### JavaScript/TypeScript (Fetch API)

```javascript
const API_BASE_URL = 'https://api.example.com/api/v1';
const API_KEY = 'your-api-key';

// List meetings
async function listMeetings(status = null, limit = 50, offset = 0) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  const response = await fetch(`${API_BASE_URL}/meetings?${params}`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Create meeting
async function createMeeting(title, participants = []) {
  const response = await fetch(`${API_BASE_URL}/meetings`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      participants,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Get meeting details
async function getMeeting(id) {
  const response = await fetch(`${API_BASE_URL}/meetings/${id}`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Update meeting
async function updateMeeting(id, updates) {
  const response = await fetch(`${API_BASE_URL}/meetings/${id}`, {
    method: 'PATCH',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Delete meeting
async function deleteMeeting(id) {
  const response = await fetch(`${API_BASE_URL}/meetings/${id}`, {
    method: 'DELETE',
    headers: {
      'X-API-Key': API_KEY,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}
```

### Python (requests)

```python
import requests

API_BASE_URL = 'https://api.example.com/api/v1'
API_KEY = 'your-api-key'

headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
}

# List meetings
def list_meetings(status=None, limit=50, offset=0):
    params = {'limit': limit, 'offset': offset}
    if status:
        params['status'] = status
    
    response = requests.get(
        f'{API_BASE_URL}/meetings',
        headers={'X-API-Key': API_KEY},
        params=params
    )
    response.raise_for_status()
    return response.json()

# Create meeting
def create_meeting(title, participants=None):
    data = {'title': title}
    if participants:
        data['participants'] = participants
    
    response = requests.post(
        f'{API_BASE_URL}/meetings',
        headers=headers,
        json=data
    )
    response.raise_for_status()
    return response.json()

# Get meeting details
def get_meeting(meeting_id):
    response = requests.get(
        f'{API_BASE_URL}/meetings/{meeting_id}',
        headers={'X-API-Key': API_KEY}
    )
    response.raise_for_status()
    return response.json()

# Update meeting
def update_meeting(meeting_id, **updates):
    response = requests.patch(
        f'{API_BASE_URL}/meetings/{meeting_id}',
        headers=headers,
        json=updates
    )
    response.raise_for_status()
    return response.json()

# Delete meeting
def delete_meeting(meeting_id):
    response = requests.delete(
        f'{API_BASE_URL}/meetings/{meeting_id}',
        headers={'X-API-Key': API_KEY}
    )
    response.raise_for_status()
    return response.json()
```

---

## Support

For issues, questions, or feature requests, please contact the API support team or refer to the main project documentation.

