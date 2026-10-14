<?php

use App\Http\Controllers\Admin\AccountController;
use App\Http\Controllers\Admin\AccountsController;
use App\Http\Controllers\Admin\BackupController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Instructor\AnnouncementController;
use App\Http\Controllers\Instructor\DashboardController as InstructorDashboardController;
use App\Http\Controllers\Instructor\JobSheetReviewController;
use App\Http\Controllers\Instructor\LessonController;
use App\Http\Controllers\Instructor\MessageController;
use App\Http\Controllers\Instructor\QuizController as InstructorQuizController;
use App\Http\Controllers\Instructor\StudentController as InstructorStudentController;
use App\Http\Controllers\Student\DashboardController as StudentDashboardController;
use App\Http\Controllers\Student\ModuleController;
use App\Http\Controllers\Student\QuizController as StudentQuizController;
use App\Http\Controllers\Student\SimulationController;
use App\Models\User;
use Illuminate\Support\Facades\Route;

Route::view('/', 'landing')->name('landing');

Route::middleware('guest')->group(function (): void {
    Route::get('/sign-in', [AuthenticatedSessionController::class, 'create'])->name('sign-in');
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])->name('login');
    Route::post('/register', [RegisteredUserController::class, 'store'])->name('register');
});

Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');

Route::middleware('auth')->group(function (): void {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    Route::middleware('role:'.User::ROLE_STUDENT)->prefix('student')->name('student.')->group(function (): void {
        Route::get('/', StudentDashboardController::class)->name('dashboard');

        Route::get('/modules', [ModuleController::class, 'index'])->name('modules.index');
        Route::get('/modules/{module}', [ModuleController::class, 'show'])->name('modules.show');
        Route::post('/modules/{module}/complete', [ModuleController::class, 'complete'])->name('modules.complete');

        Route::get('/quizzes', [StudentQuizController::class, 'index'])->name('quizzes.index');
        Route::get('/quizzes/{quiz}', [StudentQuizController::class, 'show'])->name('quizzes.show');
        Route::post('/quizzes/{quiz}', [StudentQuizController::class, 'submit'])->name('quizzes.submit');
        Route::get('/quizzes/{quiz}/result', [StudentQuizController::class, 'result'])->name('quizzes.result');

        Route::get('/simulations', [SimulationController::class, 'index'])->name('simulations.index');
        Route::get('/simulations/{simulation}', [SimulationController::class, 'show'])->name('simulations.show');
        Route::post('/simulations/{simulation}/attempts', [SimulationController::class, 'storeAttempt'])
            ->middleware('throttle:30,1')
            ->name('simulations.attempts.store');
    });

    Route::middleware('role:'.User::ROLE_INSTRUCTOR)->prefix('instructor')->name('instructor.')->group(function (): void {
        Route::get('/', InstructorDashboardController::class)->name('dashboard');
        Route::patch('/job-sheets/{jobSheetSubmission}', [JobSheetReviewController::class, 'update'])->name('job-sheets.update');
        Route::post('/announcements', [AnnouncementController::class, 'store'])->name('announcements.store');
        Route::post('/messages', [MessageController::class, 'store'])->name('messages.store');

        Route::get('/classes', [InstructorStudentController::class, 'index'])->name('classes.index');

        Route::get('/lessons', [LessonController::class, 'index'])->name('lessons.index');
        Route::get('/lessons/{module}', [LessonController::class, 'edit'])->name('lessons.edit');
        Route::post('/lessons/{module}/pages', [LessonController::class, 'storePage'])->name('lessons.pages.store');
        Route::patch('/lesson-pages/{page}', [LessonController::class, 'updatePage'])->name('lessons.pages.update');
        Route::delete('/lesson-pages/{page}', [LessonController::class, 'destroyPage'])->name('lessons.pages.destroy');

        Route::get('/quizzes', [InstructorQuizController::class, 'index'])->name('quizzes.index');
        Route::get('/quizzes/create', [InstructorQuizController::class, 'create'])->name('quizzes.create');
        Route::post('/quizzes', [InstructorQuizController::class, 'store'])->name('quizzes.store');
        Route::get('/quizzes/{quiz}/edit', [InstructorQuizController::class, 'edit'])->name('quizzes.edit');
        Route::patch('/quizzes/{quiz}', [InstructorQuizController::class, 'update'])->name('quizzes.update');
        Route::post('/quizzes/{quiz}/items', [InstructorQuizController::class, 'storeItem'])->name('quizzes.items.store');
        Route::post('/quizzes/{quiz}/items/generate', [InstructorQuizController::class, 'generateItems'])->name('quizzes.items.generate');
        Route::delete('/quiz-items/{item}', [InstructorQuizController::class, 'destroyItem'])->name('quizzes.items.destroy');
        Route::post('/quizzes/{quiz}/publish', [InstructorQuizController::class, 'publish'])->name('quizzes.publish');
    });

    Route::middleware('role:'.User::ROLE_ADMIN)->prefix('admin')->name('admin.')->group(function (): void {
        Route::get('/', AdminDashboardController::class)->name('dashboard');

        Route::get('/accounts', [AccountsController::class, 'index'])->name('accounts.index');
        Route::get('/accounts/create', [AccountsController::class, 'create'])->name('accounts.create');
        Route::post('/accounts', [AccountsController::class, 'store'])->name('accounts.store');
        Route::post('/accounts/{user}/unlock', [AccountController::class, 'unlock'])->name('accounts.unlock');
        Route::post('/accounts/{user}/approve', [AccountController::class, 'approve'])->name('accounts.approve');
        Route::post('/accounts/{user}/reset-password', [AccountController::class, 'resetPassword'])->name('accounts.reset-password');

        Route::get('/backups', [BackupController::class, 'index'])->name('backups.index');
        Route::post('/backups', [BackupController::class, 'store'])->name('backups.store');
        Route::get('/backups/{file}', [BackupController::class, 'download'])->name('backups.download');
    });
});
