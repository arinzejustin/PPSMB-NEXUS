<script setup lang="ts">
import { definePageMeta } from '#imports';
import {
  GraduationCap,
  Users,
  BookOpen,
  Clipboard,
  BarChart3,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight,
  Construction,
  Rocket
} from 'lucide-vue-next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

definePageMeta({
  layout: 'app'
});

// Planned features for the Student Records module
const plannedFeatures = [
  {
    title: 'Student Registry',
    description: 'Comprehensive database of all students across schools',
    icon: Users,
    status: 'planned'
  },
  {
    title: 'Academic Records',
    description: 'Track grades, exams, and academic performance',
    icon: BookOpen,
    status: 'planned'
  },
  {
    title: 'Attendance Tracking',
    description: 'Daily attendance records with absence notifications',
    icon: Clipboard,
    status: 'planned'
  },
  {
    title: 'Performance Analytics',
    description: 'Zone and school-level performance dashboards',
    icon: BarChart3,
    status: 'planned'
  },
  {
    title: 'Term Calendar',
    description: 'Academic calendar and event management',
    icon: Calendar,
    status: 'planned'
  },
  {
    title: 'Graduation Tracking',
    description: 'Monitor student progression and graduation rates',
    icon: GraduationCap,
    status: 'planned'
  }
];

// Timeline
const timeline = [
  { phase: 'Phase 1', title: 'Database Schema Design', status: 'upcoming' },
  { phase: 'Phase 2', title: 'Core Registry Implementation', status: 'upcoming' },
  { phase: 'Phase 3', title: 'Academic Records Module', status: 'upcoming' },
  { phase: 'Phase 4', title: 'Analytics & Reporting', status: 'upcoming' }
];
</script>

<template>
  <div class="space-y-6">
    <!-- Coming Soon Banner -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 text-white">
      <!-- Background Pattern -->
      <div class="absolute inset-0 opacity-10">
        <svg class="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" stroke-width="0.5"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>
      </div>
      
      <!-- Floating Icons -->
      <div class="absolute -top-6 -right-6 opacity-20">
        <GraduationCap class="w-48 h-48" />
      </div>
      
      <div class="relative z-10 max-w-2xl">
        <Badge class="bg-white/20 text-white border-0 mb-4">
          <Construction class="w-3 h-3 mr-1" />
          Coming Soon
        </Badge>
        <h1 class="text-3xl font-bold mb-3">Student Records Management</h1>
        <p class="text-lg text-white/80 mb-6">
          A comprehensive system for managing student information, academic records, 
          and performance analytics across all schools in Enugu State.
        </p>
        <div class="flex items-center gap-4">
          <Button class="bg-white text-violet-700 hover:bg-white/90">
            <Rocket class="w-4 h-4 mr-2" />
            Get Notified
          </Button>
          <Button variant="outline" class="border-white/30 text-white hover:bg-white/10">
            Learn More
          </Button>
        </div>
      </div>
    </div>

    <!-- Planned Features -->
    <div>
      <h2 class="text-xl font-semibold mb-4">Planned Features</h2>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card v-for="feature in plannedFeatures" :key="feature.title" class="relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CardHeader>
            <div class="flex items-start justify-between">
              <div class="p-2 rounded-lg bg-primary/10">
                <component :is="feature.icon" class="w-5 h-5 text-primary" />
              </div>
              <Badge variant="outline" class="text-xs">
                <Clock class="w-3 h-3 mr-1" />
                Planned
              </Badge>
            </div>
            <CardTitle class="text-base mt-3">{{ feature.title }}</CardTitle>
            <CardDescription>{{ feature.description }}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>

    <!-- Wireframe Preview -->
    <Card>
      <CardHeader>
        <CardTitle>Interface Preview</CardTitle>
        <CardDescription>Conceptual wireframe of the Student Records interface</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="border-2 border-dashed rounded-xl p-8 bg-muted/30">
          <!-- Wireframe Mockup -->
          <div class="space-y-4">
            <!-- Header -->
            <div class="flex items-center gap-4">
              <div class="h-8 w-48 bg-muted rounded animate-pulse"></div>
              <div class="flex-1"></div>
              <div class="h-8 w-24 bg-muted rounded animate-pulse"></div>
              <div class="h-8 w-24 bg-muted rounded animate-pulse"></div>
            </div>
            
            <!-- Stats Row -->
            <div class="grid grid-cols-4 gap-4">
              <div v-for="i in 4" :key="i" class="h-24 bg-muted rounded-lg animate-pulse"></div>
            </div>
            
            <!-- Charts Row -->
            <div class="grid grid-cols-3 gap-4">
              <div class="col-span-2 h-64 bg-muted rounded-lg animate-pulse flex items-center justify-center">
                <BarChart3 class="w-12 h-12 text-muted-foreground/30" />
              </div>
              <div class="h-64 bg-muted rounded-lg animate-pulse flex items-center justify-center">
                <Users class="w-12 h-12 text-muted-foreground/30" />
              </div>
            </div>
            
            <!-- Table Mockup -->
            <div class="bg-muted rounded-lg animate-pulse">
              <div class="h-12 border-b border-muted-foreground/10"></div>
              <div v-for="i in 5" :key="i" class="h-14 border-b border-muted-foreground/5"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Development Timeline -->
    <Card>
      <CardHeader>
        <CardTitle>Development Timeline</CardTitle>
        <CardDescription>Estimated rollout schedule for the Student Records module</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="relative">
          <!-- Timeline Line -->
          <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-muted"></div>
          
          <!-- Timeline Items -->
          <div class="space-y-6">
            <div
              v-for="(item, index) in timeline"
              :key="item.phase"
              class="relative flex items-start gap-4 pl-10"
            >
              <!-- Dot -->
              <div class="absolute left-0 p-1.5 rounded-full bg-muted border-4 border-background">
                <div :class="[
                  'w-3 h-3 rounded-full',
                  item.status === 'completed' ? 'bg-emerald-500' : 'bg-primary/30'
                ]"></div>
              </div>
              
              <div class="flex-1 pb-6">
                <div class="flex items-center gap-2 mb-1">
                  <Badge variant="outline" class="text-xs font-semibold">
                    {{ item.phase }}
                  </Badge>
                  <Badge v-if="item.status === 'completed'" class="bg-emerald-100 text-emerald-700">
                    <CheckCircle2 class="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                </div>
                <h4 class="font-medium">{{ item.title }}</h4>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
