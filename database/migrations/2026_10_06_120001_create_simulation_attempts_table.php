<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('simulation_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('simulation_key');
            $table->foreignId('module_page_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedSmallInteger('score');
            $table->unsignedSmallInteger('max_score');
            $table->json('payload');
            $table->timestamp('completed_at');
            $table->timestamps();

            $table->index(['user_id', 'simulation_key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('simulation_attempts');
    }
};
