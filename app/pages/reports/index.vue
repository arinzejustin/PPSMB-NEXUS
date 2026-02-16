<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { definePageMeta, useRoute, useHead } from '#imports';
import {
  BarChart3,
  FileText,
  Users,
  Building2,
  ArrowLeftRight,
  GraduationCap,
  Calendar,
  Download,
  Printer,
  Eye,
  Clock,
  Play,
  Plus,
  ChevronRight,
  FileSpreadsheet,
  FileType,
  MapPin,
  Loader2,
  Star,
  History
} from 'lucide-vue-next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import DepartmentTaskReport from '@/components/app/DepartmentTaskReport.vue';
import { useIsDesktop } from '@/composables/useIsDesktop';

const route = useRoute();
const isDesktop = useIsDesktop();

definePageMeta({
  layout: 'app',
  middleware: "user-validate"
});
useHead({
  title: isDesktop ? 'PPSMB File Manager' : 'Reports - PPSMB File Manager'
})


const activeTab = ref('library');
const showReportBuilder = ref(false);
const isGenerating = ref(false);
const selectedReport = ref<any>(null);

// Route query params for cross-page navigation (from dashboard)
const initialMonth = ref('');
const initialYear = ref('');

onMounted(() => {
  if (route.query.tab === 'task-completion') {
    activeTab.value = 'task-completion';
  }
  if (route.query.month && typeof route.query.month === 'string') {
    initialMonth.value = route.query.month;
  }
  if (route.query.year && typeof route.query.year === 'string') {
    initialYear.value = route.query.year;
  }
});

// Pre-built report templates
const reportTemplates = ref([
  {
    id: 'RPT001',
    name: 'Teacher Census Report',
    description: 'Comprehensive overview of all teachers including demographics, qualifications, and distribution by zone.',
    icon: Users,
    category: 'census',
    frequency: 'Monthly',
    lastGenerated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    color: 'from-blue-500 to-blue-600',
    fields: ['Zone', 'School', 'Gender', 'Qualification', 'Years of Service']
  },
  {
    id: 'RPT002',
    name: 'Transfer Statistics',
    description: 'Summary of teacher transfers including approvals, pending requests, and zone-to-zone movements.',
    icon: ArrowLeftRight,
    category: 'transfers',
    frequency: 'Weekly',
    lastGenerated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    color: 'from-amber-500 to-amber-600',
    fields: ['From Zone', 'To Zone', 'Status', 'Date Range']
  },
  {
    id: 'RPT003',
    name: 'Certification Status',
    description: 'Report on teaching certifications including active, expiring, and expired certificates.',
    icon: GraduationCap,
    category: 'certification',
    frequency: 'Monthly',
    lastGenerated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    color: 'from-emerald-500 to-emerald-600',
    fields: ['Status', 'Expiry Period', 'Zone', 'Qualification']
  },
  {
    id: 'RPT004',
    name: 'Zone Statistics',
    description: 'Detailed breakdown of teachers, schools, and resources by administrative zone.',
    icon: MapPin,
    category: 'zones',
    frequency: 'Quarterly',
    lastGenerated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    color: 'from-violet-500 to-violet-600',
    fields: ['Zone', 'School Type', 'Teacher Count', 'Student Ratio']
  },
  {
    id: 'RPT005',
    name: 'School Staffing Report',
    description: 'Analysis of teacher allocation per school including shortages and surpluses.',
    icon: Building2,
    category: 'schools',
    frequency: 'Monthly',
    lastGenerated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
    color: 'from-rose-500 to-rose-600',
    fields: ['School', 'Zone', 'Required Teachers', 'Current Staff']
  },
  {
    id: 'RPT006',
    name: 'Document Processing Summary',
    description: 'Overview of scanned documents, OCR status, and processing metrics.',
    icon: FileText,
    category: 'documents',
    frequency: 'Weekly',
    lastGenerated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
    color: 'from-cyan-500 to-cyan-600',
    fields: ['Category', 'Status', 'Date Range', 'User']
  }
]);

// Recent reports
const recentReports = ref([
  {
    id: 'GEN001',
    name: 'Teacher Census Report - January 2026',
    template: 'Teacher Census Report',
    generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    generatedBy: 'Admin User',
    format: 'PDF',
    size: '2.4 MB',
    status: 'completed'
  },
  {
    id: 'GEN002',
    name: 'Transfer Statistics - Week 3',
    template: 'Transfer Statistics',
    generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    generatedBy: 'HR Staff',
    format: 'Excel',
    size: '856 KB',
    status: 'completed'
  },
  {
    id: 'GEN003',
    name: 'Certification Expiry Alert - Feb 2026',
    template: 'Certification Status',
    generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    generatedBy: 'Admin User',
    format: 'PDF',
    size: '1.1 MB',
    status: 'completed'
  },
  {
    id: 'GEN004',
    name: 'Zone Analysis - Q4 2025',
    template: 'Zone Statistics',
    generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
    generatedBy: 'Director',
    format: 'PDF',
    size: '3.8 MB',
    status: 'completed'
  }
]);

// Report Builder State
const builderState = ref({
  reportType: '',
  dateFrom: '',
  dateTo: '',
  zones: [] as string[],
  schools: [] as string[],
  includeCharts: true,
  includeSummary: true,
  format: 'pdf',
  fields: [] as string[]
});

const zones = [
  'Enugu North', 'Enugu South', 'Enugu East', 'Nsukka', 'Udi', 'Awgu'
];

const reportTypes = [
  { value: 'custom_census', label: 'Custom Census Report' },
  { value: 'custom_transfer', label: 'Custom Transfer Report' },
  { value: 'custom_certification', label: 'Custom Certification Report' },
  { value: 'custom_zone', label: 'Custom Zone Report' }
];

const availableFields = [
  'Teacher Name', 'Teacher ID', 'Zone', 'School', 'Qualification',
  'Subject', 'Years of Service', 'Employment Date', 'Certification Status',
  'Certification Expiry', 'Gender', 'Date of Birth', 'Contact', 'Last Transfer'
];

const openReportBuilder = (template?: any) => {
  if (template) {
    selectedReport.value = template;
    builderState.value.reportType = template.id;
  } else {
    selectedReport.value = null;
    builderState.value = {
      reportType: '',
      dateFrom: '',
      dateTo: '',
      zones: [],
      schools: [],
      includeCharts: true,
      includeSummary: true,
      format: 'pdf',
      fields: []
    };
  }
  showReportBuilder.value = true;
};

const generateReport = () => {
  isGenerating.value = true;
  // Simulate report generation
  setTimeout(() => {
    isGenerating.value = false;
    showReportBuilder.value = false;
    // Would add to recentReports here
  }, 2000);
};

const toggleZone = (zone: string) => {
  const index = builderState.value.zones.indexOf(zone);
  if (index > -1) {
    builderState.value.zones.splice(index, 1);
  } else {
    builderState.value.zones.push(zone);
  }
};

const toggleField = (field: string) => {
  const index = builderState.value.fields.indexOf(field);
  if (index > -1) {
    builderState.value.fields.splice(index, 1);
  } else {
    builderState.value.fields.push(field);
  }
};

const getFormatIcon = (format: string) => {
  switch (format.toLowerCase()) {
    case 'pdf': return FileType;
    case 'excel': return FileSpreadsheet;
    default: return FileText;
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground">Reporting Engine</h1>
        <p class="text-muted-foreground mt-1">
          Generate reports and analyze system data
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <History class="w-4 h-4 mr-2" />
          Report History
        </Button>
        <Button size="sm" @click="openReportBuilder()">
          <Plus class="w-4 h-4 mr-2" />
          Custom Report
        </Button>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid gap-4 md:grid-cols-4">
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center gap-4">
            <div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <BarChart3 class="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ reportTemplates.length }}</p>
              <p class="text-sm text-muted-foreground">Report Templates</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center gap-4">
            <div class="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <FileText class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ recentReports.length }}</p>
              <p class="text-sm text-muted-foreground">Recent Reports</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center gap-4">
            <div class="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Calendar class="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p class="text-2xl font-bold">12</p>
              <p class="text-sm text-muted-foreground">This Month</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center gap-4">
            <div class="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Star class="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p class="text-2xl font-bold">3</p>
              <p class="text-sm text-muted-foreground">Favorites</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Main Content -->
    <Tabs v-model="activeTab" class="space-y-6">
      <TabsList>
        <TabsTrigger value="library">Report Library</TabsTrigger>
        <TabsTrigger value="recent">Recent Reports</TabsTrigger>
        <TabsTrigger value="task-completion">Task Report</TabsTrigger>
      </TabsList>

      <!-- Report Library -->
      <TabsContent value="library" class="space-y-6">
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card v-for="report in reportTemplates" :key="report.id"
            class="group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden"
            @click="openReportBuilder(report)">
            <CardHeader class="pb-3">
              <div class="flex items-start justify-between">
                <div :class="['p-3 rounded-xl bg-linear-to-br text-white', report.color]">
                  <component :is="report.icon" class="w-6 h-6" />
                </div>
                <Badge variant="outline">{{ report.frequency }}</Badge>
              </div>
              <CardTitle class="text-lg mt-4">{{ report.name }}</CardTitle>
              <CardDescription class="line-clamp-2">{{ report.description }}</CardDescription>
            </CardHeader>
            <CardContent>
              <div class="flex flex-wrap gap-1 mb-4">
                <Badge v-for="field in report.fields.slice(0, 3)" :key="field" variant="secondary" class="text-xs">
                  {{ field }}
                </Badge>
                <Badge v-if="report.fields.length > 3" variant="secondary" class="text-xs">
                  +{{ report.fields.length - 3 }} more
                </Badge>
              </div>
              <div class="flex items-center justify-between text-sm text-muted-foreground">
                <span class="flex items-center gap-1">
                  <Clock class="w-3 h-3" />
                  Last: {{ format(report.lastGenerated, 'MMM d') }}
                </span>
                <Button variant="ghost" size="sm" class="opacity-0 group-hover:opacity-100 transition-opacity">
                  Generate
                  <ChevronRight class="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <!-- Recent Reports -->
      <TabsContent value="recent" class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>Recently generated reports available for download</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="divide-y">
              <div v-for="report in recentReports" :key="report.id"
                class="flex items-center gap-4 py-4 hover:bg-muted/50 -mx-6 px-6 transition-colors">
                <div class="p-2 rounded-lg bg-primary/10">
                  <component :is="getFormatIcon(report.format)" class="w-5 h-5 text-primary" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium truncate">{{ report.name }}</p>
                  <div class="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{{ report.template }}</span>
                    <span>•</span>
                    <span>{{ report.generatedBy }}</span>
                    <span>•</span>
                    <span>{{ format(report.generatedAt, 'MMM d, h:mm a') }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <Badge variant="outline">{{ report.format }}</Badge>
                  <span class="text-sm text-muted-foreground">{{ report.size }}</span>
                  <Button variant="ghost" size="sm">
                    <Eye class="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download class="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Printer class="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Department Task Completion Report -->
      <TabsContent value="task-completion" class="space-y-6">
        <DepartmentTaskReport :initial-month="initialMonth" :initial-year="initialYear" :is-desktop="isDesktop" />
      </TabsContent>
    </Tabs>

    <!-- Report Builder Dialog -->
    <Dialog v-model:open="showReportBuilder">
      <DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {{ selectedReport ? `Generate: ${selectedReport.name}` : 'Custom Report Builder' }}
          </DialogTitle>
          <DialogDescription>
            Configure report parameters and generate
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-6 py-4">
          <!-- Report Type (for custom reports) -->
          <div v-if="!selectedReport">
            <Label>Report Type</Label>
            <Select v-model="builderState.reportType">
              <SelectTrigger class="mt-2">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="type in reportTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Date Range -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <Label>From Date</Label>
              <Input type="date" v-model="builderState.dateFrom" class="mt-2" />
            </div>
            <div>
              <Label>To Date</Label>
              <Input type="date" v-model="builderState.dateTo" class="mt-2" />
            </div>
          </div>

          <!-- Zone Selection -->
          <div>
            <Label>Zones (Select multiple)</Label>
            <div class="grid grid-cols-3 gap-2 mt-2">
              <div v-for="zone in zones" :key="zone" @click="toggleZone(zone)" :class="[
                'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors',
                builderState.zones.includes(zone)
                  ? 'bg-primary/10 border-primary'
                  : 'hover:bg-muted'
              ]">
                <Checkbox :checked="builderState.zones.includes(zone)" />
                <span class="text-sm">{{ zone }}</span>
              </div>
            </div>
          </div>

          <!-- Field Selection (for custom reports) -->
          <div v-if="!selectedReport">
            <Label>Include Fields</Label>
            <ScrollArea class="h-48 mt-2 border rounded-lg p-3">
              <div class="space-y-2">
                <div v-for="field in availableFields" :key="field" @click="toggleField(field)" :class="[
                  'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                  builderState.fields.includes(field)
                    ? 'bg-primary/10'
                    : 'hover:bg-muted'
                ]">
                  <Checkbox :checked="builderState.fields.includes(field)" />
                  <span class="text-sm">{{ field }}</span>
                </div>
              </div>
            </ScrollArea>
          </div>

          <!-- Options -->
          <div class="space-y-3">
            <Label>Options</Label>
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <Checkbox id="charts" :checked="builderState.includeCharts"
                  @update:checked="builderState.includeCharts = $event" />
                <label for="charts" class="text-sm cursor-pointer">Include Charts</label>
              </div>
              <div class="flex items-center gap-2">
                <Checkbox id="summary" :checked="builderState.includeSummary"
                  @update:checked="builderState.includeSummary = $event" />
                <label for="summary" class="text-sm cursor-pointer">Include Summary</label>
              </div>
            </div>
          </div>

          <!-- Output Format -->
          <div>
            <Label>Output Format</Label>
            <div class="flex items-center gap-3 mt-2">
              <Button :variant="builderState.format === 'pdf' ? 'default' : 'outline'" size="sm"
                @click="builderState.format = 'pdf'">
                <FileType class="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button :variant="builderState.format === 'excel' ? 'default' : 'outline'" size="sm"
                @click="builderState.format = 'excel'">
                <FileSpreadsheet class="w-4 h-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showReportBuilder = false">Cancel</Button>
          <Button @click="generateReport" :disabled="isGenerating">
            <template v-if="isGenerating">
              <Loader2 class="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </template>
            <template v-else>
              <Play class="w-4 h-4 mr-2" />
              Generate Report
            </template>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
