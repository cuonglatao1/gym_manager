# Demo Class Schedule API
# Demonstrates all class schedule related endpoints

# API Configuration
$BaseUrl = "http://localhost:3000/api"
$Headers = @{
    "Content-Type" = "application/json"
}

Write-Host "=== GYM MANAGER - CLASS SCHEDULE API DEMO ===" -ForegroundColor Cyan
Write-Host ""

# Function to make API requests with error handling
function Invoke-ApiRequest {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers,
        [string]$Body
    )
    
    try {
        if ($Body) {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers -Body $Body
        } else {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers
        }
        return $response
    }
    catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Red
        }
        return $null
    }
}

# Demo admin login (you'll need to adjust credentials)
Write-Host "1. LOGIN AS ADMIN" -ForegroundColor Yellow
$loginData = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-ApiRequest -Method "POST" -Url "$BaseUrl/auth/login" -Headers $Headers -Body $loginData

if ($loginResponse -and $loginResponse.success) {
    $token = $loginResponse.data.token
    $Headers["Authorization"] = "Bearer $token"
    Write-Host "* Admin login successful" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
} else {
    Write-Host "x Admin login failed. Please check credentials." -ForegroundColor Red
    exit
}
Write-Host ""

# 2. Get all class schedules
Write-Host "2. GET ALL CLASS SCHEDULES" -ForegroundColor Yellow
$schedules = Invoke-ApiRequest -Method "GET" -Url "$BaseUrl/classes/schedules" -Headers $Headers
if ($schedules -and $schedules.success) {
    Write-Host "* Found $($schedules.data.schedules.Count) schedules" -ForegroundColor Green
    $schedules.data.schedules | Select-Object -First 3 | ForEach-Object {
        Write-Host "  - ID: $($_.id) | Date: $($_.date) | Time: $($_.startTime) - $($_.endTime) | Status: $($_.status)" -ForegroundColor Gray
    }
} else {
    Write-Host "x Failed to get schedules" -ForegroundColor Red
}
Write-Host ""

# 3. Get schedules with date filter
Write-Host "3. GET SCHEDULES FOR TODAY" -ForegroundColor Yellow
$today = Get-Date -Format "yyyy-MM-dd"
$todaySchedules = Invoke-ApiRequest -Method "GET" -Url "$BaseUrl/classes/schedules?date=$today" -Headers $Headers
if ($todaySchedules -and $todaySchedules.success) {
    Write-Host "* Found $($todaySchedules.data.schedules.Count) schedules for today" -ForegroundColor Green
    $todaySchedules.data.schedules | ForEach-Object {
        Write-Host "  - Class: $($_.Class.name) | Time: $($_.startTime) - $($_.endTime) | Room: $($_.room)" -ForegroundColor Gray
    }
} else {
    Write-Host "x Failed to get today's schedules" -ForegroundColor Red
}
Write-Host ""

# 4. Get schedules for date range
Write-Host "4. GET SCHEDULES FOR NEXT 7 DAYS" -ForegroundColor Yellow
$startDate = Get-Date -Format "yyyy-MM-dd"
$endDate = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
$weekSchedules = Invoke-ApiRequest -Method "GET" -Url "$BaseUrl/classes/schedules?startDate=$startDate&endDate=$endDate" -Headers $Headers
if ($weekSchedules -and $weekSchedules.success) {
    Write-Host "* Found $($weekSchedules.data.schedules.Count) schedules for next 7 days" -ForegroundColor Green
    $weekSchedules.data.schedules | Group-Object date | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count) classes" -ForegroundColor Gray
    }
} else {
    Write-Host "x Failed to get week schedules" -ForegroundColor Red
}
Write-Host ""

# 5. Create a new class schedule (assuming we have a class with ID 1)
Write-Host "5. CREATE NEW CLASS SCHEDULE" -ForegroundColor Yellow
$tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
$startTime = (Get-Date).AddDays(1).AddHours(10).ToString("yyyy-MM-ddTHH:mm:ss")
$endTime = (Get-Date).AddDays(1).AddHours(11).ToString("yyyy-MM-ddTHH:mm:ss")

$newScheduleData = @{
    date = $tomorrow
    startTime = $startTime
    endTime = $endTime
    maxParticipants = 15
    room = "Studio A"
    notes = "Demo class schedule"
} | ConvertTo-Json

# First, get available classes
$classes = Invoke-ApiRequest -Method "GET" -Url "$BaseUrl/classes" -Headers $Headers
if ($classes -and $classes.success -and $classes.data.classes.Count -gt 0) {
    $classId = $classes.data.classes[0].id
    Write-Host "Using class ID: $classId" -ForegroundColor Gray
    
    $newSchedule = Invoke-ApiRequest -Method "POST" -Url "$BaseUrl/classes/$classId/schedules" -Headers $Headers -Body $newScheduleData
    if ($newSchedule -and $newSchedule.success) {
        Write-Host "* Created new schedule with ID: $($newSchedule.data.id)" -ForegroundColor Green
        $createdScheduleId = $newSchedule.data.id
    } else {
        Write-Host "x Failed to create schedule" -ForegroundColor Red
        $createdScheduleId = $null
    }
} else {
    Write-Host "x No classes available to create schedule" -ForegroundColor Red
    $createdScheduleId = $null
}
Write-Host ""

# 6. Get specific schedule details
if ($createdScheduleId) {
    Write-Host "6. GET SPECIFIC SCHEDULE DETAILS" -ForegroundColor Yellow
    $scheduleDetail = Invoke-ApiRequest -Method "GET" -Url "$BaseUrl/classes/schedules/$createdScheduleId" -Headers $Headers
    if ($scheduleDetail -and $scheduleDetail.success) {
        Write-Host "* Schedule details retrieved" -ForegroundColor Green
        Write-Host "  - Date: $($scheduleDetail.data.date)" -ForegroundColor Gray
        Write-Host "  - Time: $($scheduleDetail.data.startTime) - $($scheduleDetail.data.endTime)" -ForegroundColor Gray
        Write-Host "  - Room: $($scheduleDetail.data.room)" -ForegroundColor Gray
        Write-Host "  - Max Participants: $($scheduleDetail.data.maxParticipants)" -ForegroundColor Gray
        Write-Host "  - Current Participants: $($scheduleDetail.data.currentParticipants)" -ForegroundColor Gray
        Write-Host "  - Status: $($scheduleDetail.data.status)" -ForegroundColor Gray
    } else {
        Write-Host "x Failed to get schedule details" -ForegroundColor Red
    }
    Write-Host ""

    # 7. Update the schedule
    Write-Host "7. UPDATE CLASS SCHEDULE" -ForegroundColor Yellow
    $updateData = @{
        maxParticipants = 20
        room = "Studio B"
        notes = "Updated demo class schedule"
    } | ConvertTo-Json

    $updatedSchedule = Invoke-ApiRequest -Method "PUT" -Url "$BaseUrl/classes/schedules/$createdScheduleId" -Headers $Headers -Body $updateData
    if ($updatedSchedule -and $updatedSchedule.success) {
        Write-Host "* Schedule updated successfully" -ForegroundColor Green
        Write-Host "  - New max participants: $($updatedSchedule.data.maxParticipants)" -ForegroundColor Gray
        Write-Host "  - New room: $($updatedSchedule.data.room)" -ForegroundColor Gray
    } else {
        Write-Host "x Failed to update schedule" -ForegroundColor Red
    }
    Write-Host ""
}

# 8. Demo member enrollment (need to login as member first)
Write-Host "8. MEMBER ENROLLMENT DEMO" -ForegroundColor Yellow

# Try to login as member (adjust credentials as needed)
$memberLoginData = @{
    username = "member"
    password = "member123"
} | ConvertTo-Json

$memberLogin = Invoke-ApiRequest -Method "POST" -Url "$BaseUrl/auth/login" -Headers @{"Content-Type" = "application/json"} -Body $memberLoginData

if ($memberLogin -and $memberLogin.success) {
    $memberHeaders = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $($memberLogin.data.token)"
    }
    Write-Host "* Member login successful" -ForegroundColor Green
    
    # Get available schedules for enrollment
    $availableSchedules = Invoke-ApiRequest -Method "GET" -Url "$BaseUrl/classes/schedules" -Headers $memberHeaders
    if ($availableSchedules -and $availableSchedules.success -and $availableSchedules.data.schedules.Count -gt 0) {
        $scheduleToEnroll = $availableSchedules.data.schedules[0].id
        
        # Try to enroll
        $enrollment = Invoke-ApiRequest -Method "POST" -Url "$BaseUrl/classes/schedules/$scheduleToEnroll/enroll" -Headers $memberHeaders
        if ($enrollment -and $enrollment.success) {
            Write-Host "* Successfully enrolled in class schedule ID: $scheduleToEnroll" -ForegroundColor Green
            
            # Get my upcoming classes
            $myClasses = Invoke-ApiRequest -Method "GET" -Url "$BaseUrl/classes/my/schedules" -Headers $memberHeaders
            if ($myClasses -and $myClasses.success) {
                Write-Host "* My upcoming classes: $($myClasses.data.Count)" -ForegroundColor Green
            }
            
            # Cancel enrollment
            $cancelEnrollment = Invoke-ApiRequest -Method "DELETE" -Url "$BaseUrl/classes/schedules/$scheduleToEnroll/enroll" -Headers $memberHeaders
            if ($cancelEnrollment -and $cancelEnrollment.success) {
                Write-Host "* Successfully cancelled enrollment" -ForegroundColor Green
            }
        } else {
            Write-Host "x Failed to enroll in class" -ForegroundColor Red
        }
    }
} else {
    Write-Host "x Member login failed. Skipping enrollment demo." -ForegroundColor Red
}
Write-Host ""

# 9. Get class enrollments (back to admin)
if ($createdScheduleId) {
    Write-Host "9. GET CLASS ENROLLMENTS (ADMIN)" -ForegroundColor Yellow
    $enrollments = Invoke-ApiRequest -Method "GET" -Url "$BaseUrl/classes/schedules/$createdScheduleId/enrollments" -Headers $Headers
    if ($enrollments -and $enrollments.success) {
        Write-Host "* Found $($enrollments.data.Count) enrollments for schedule $createdScheduleId" -ForegroundColor Green
        $enrollments.data | ForEach-Object {
            Write-Host "  - User: $($_.User.fullName) | Status: $($_.status) | Enrolled: $($_.enrolledAt)" -ForegroundColor Gray
        }
    } else {
        Write-Host "x Failed to get enrollments" -ForegroundColor Red
    }
    Write-Host ""
}

# 10. Analytics demos
Write-Host "10. ANALYTICS DEMOS" -ForegroundColor Yellow

# Popular classes
$popularClasses = Invoke-ApiRequest -Method "GET" -Url "$BaseUrl/classes/analytics/popular?limit=5" -Headers $Headers
if ($popularClasses -and $popularClasses.success) {
    Write-Host "* Top 5 popular classes:" -ForegroundColor Green
    $popularClasses.data | ForEach-Object {
        Write-Host "  - $($_.name): $($_.totalEnrollments) enrollments" -ForegroundColor Gray
    }
} else {
    Write-Host "x Failed to get popular classes" -ForegroundColor Red
}

# Class revenue
$revenue = Invoke-ApiRequest -Method "GET" -Url "$BaseUrl/classes/analytics/revenue" -Headers $Headers
if ($revenue -and $revenue.success) {
    Write-Host "* Class revenue analytics retrieved" -ForegroundColor Green
    Write-Host "  - Total Revenue: $($revenue.data.totalRevenue)" -ForegroundColor Gray
} else {
    Write-Host "x Failed to get revenue data" -ForegroundColor Red
}

# Attendance stats
$attendance = Invoke-ApiRequest -Method "GET" -Url "$BaseUrl/classes/analytics/attendance" -Headers $Headers
if ($attendance -and $attendance.success) {
    Write-Host "* Attendance statistics retrieved" -ForegroundColor Green
    Write-Host "  - Total Classes: $($attendance.data.totalSchedules)" -ForegroundColor Gray
    Write-Host "  - Total Enrollments: $($attendance.data.totalEnrollments)" -ForegroundColor Gray
} else {
    Write-Host "x Failed to get attendance stats" -ForegroundColor Red
}
Write-Host ""

# 11. Cleanup - Cancel the created schedule
if ($createdScheduleId) {
    Write-Host "11. CLEANUP - CANCEL CREATED SCHEDULE" -ForegroundColor Yellow
    $cancelSchedule = Invoke-ApiRequest -Method "DELETE" -Url "$BaseUrl/classes/schedules/$createdScheduleId" -Headers $Headers
    if ($cancelSchedule -and $cancelSchedule.success) {
        Write-Host "* Successfully cancelled schedule ID: $createdScheduleId" -ForegroundColor Green
    } else {
        Write-Host "x Failed to cancel schedule" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== DEMO COMPLETED ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Available Class Schedule API Endpoints:" -ForegroundColor White
Write-Host "• GET    /api/classes/schedules                    - Get all schedules with filters" -ForegroundColor Gray
Write-Host "• GET    /api/classes/schedules/:id               - Get specific schedule details" -ForegroundColor Gray
Write-Host "• POST   /api/classes/:id/schedules               - Create new schedule (Admin/Trainer)" -ForegroundColor Gray
Write-Host "• PUT    /api/classes/schedules/:id               - Update schedule (Admin/Trainer)" -ForegroundColor Gray
Write-Host "• DELETE /api/classes/schedules/:id               - Cancel schedule (Admin/Trainer)" -ForegroundColor Gray
Write-Host "• POST   /api/classes/schedules/:id/enroll        - Enroll in class (Member)" -ForegroundColor Gray
Write-Host "• DELETE /api/classes/schedules/:id/enroll        - Cancel enrollment (Member)" -ForegroundColor Gray
Write-Host "• POST   /api/classes/schedules/:id/checkin       - Check-in to class (Member)" -ForegroundColor Gray
Write-Host "• POST   /api/classes/schedules/:id/checkout      - Check-out from class (Member)" -ForegroundColor Gray
Write-Host "• GET    /api/classes/schedules/:id/enrollments   - Get class enrollments (Admin/Trainer)" -ForegroundColor Gray
Write-Host "• GET    /api/classes/my/schedules                - Get my upcoming classes (Member)" -ForegroundColor Gray
Write-Host "• GET    /api/classes/my/history                  - Get my class history (Member)" -ForegroundColor Gray
Write-Host "• GET    /api/classes/trainer/schedules           - Get trainer schedules (Trainer)" -ForegroundColor Gray
Write-Host "• GET    /api/classes/analytics/popular           - Get popular classes (Admin)" -ForegroundColor Gray
Write-Host "• GET    /api/classes/analytics/revenue           - Get class revenue (Admin)" -ForegroundColor Gray
Write-Host "• GET    /api/classes/analytics/attendance        - Get attendance stats (Admin)" -ForegroundColor Gray
Write-Host ""
Write-Host "Query Parameters for /api/classes/schedules:" -ForegroundColor White
Write-Host "• date=YYYY-MM-DD                                 - Filter by specific date" -ForegroundColor Gray
Write-Host "• startDate=YYYY-MM-DD&endDate=YYYY-MM-DD         - Filter by date range" -ForegroundColor Gray
Write-Host "• classId=1                                       - Filter by specific class" -ForegroundColor Gray
Write-Host "• trainerId=1                                     - Filter by specific trainer" -ForegroundColor Gray
Write-Host "• status=scheduled                                - Filter by status" -ForegroundColor Gray
Write-Host "• page=1&limit=10                                 - Pagination" -ForegroundColor Gray