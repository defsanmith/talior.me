"use client";

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppearancePreview } from "@/components/appearance/appearance-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  useCreatePresetMutation,
  useDeletePresetMutation,
  useGetPresetsQuery,
  useSetDefaultPresetMutation,
  useUpdatePresetMutation,
} from "@/store/api/presets/queries";
import { FontFamily, ResumePreset, SectionOrder } from "@tailor.me/shared";

// ============================================
// Constants
// ============================================

const FONT_OPTIONS: { value: FontFamily; label: string; sample: string }[] = [
  {
    value: FontFamily.COMPUTER_MODERN,
    label: "Computer Modern",
    sample: "The quick brown fox",
  },
  {
    value: FontFamily.TIMES,
    label: "Times New Roman",
    sample: "The quick brown fox",
  },
  {
    value: FontFamily.HELVETICA,
    label: "Helvetica",
    sample: "The quick brown fox",
  },
  {
    value: FontFamily.PALATINO,
    label: "Palatino",
    sample: "The quick brown fox",
  },
  {
    value: FontFamily.CHARTER,
    label: "Charter",
    sample: "The quick brown fox",
  },
  {
    value: FontFamily.GARAMOND,
    label: "Garamond",
    sample: "The quick brown fox",
  },
  {
    value: FontFamily.SOURCE_SANS_PRO,
    label: "Source Sans Pro",
    sample: "The quick brown fox",
  },
];

const DEFAULT_SECTION_ORDER: SectionOrder[] = [
  { id: "education", type: "education", visible: true, order: 0 },
  { id: "experience", type: "experience", visible: true, order: 1 },
  { id: "skills", type: "skills", visible: true, order: 2 },
  { id: "projects", type: "projects", visible: true, order: 3 },
  { id: "certifications", type: "certifications", visible: true, order: 4 },
];

const SECTION_LABELS: Record<string, string> = {
  education: "Education",
  experience: "Experience",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
};

// ============================================
// SortableSectionRow
// ============================================

function SortableSectionRow({
  section,
  onToggleVisible,
}: {
  section: SectionOrder;
  onToggleVisible: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 font-medium">
        {SECTION_LABELS[section.type] ?? section.type}
      </span>
      <button
        onClick={() => onToggleVisible(section.id)}
        className="text-muted-foreground transition-colors hover:text-foreground"
        aria-label={section.visible ? "Hide section" : "Show section"}
      >
        {section.visible ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4 opacity-50" />
        )}
      </button>
    </div>
  );
}

// ============================================
// Preset Editor Panel
// ============================================

interface EditorState {
  name: string;
  fontFamily: FontFamily;
  fontSize: 10 | 11 | 12;
  sectionOrder: SectionOrder[];
}

function buildEditorState(preset?: ResumePreset | null): EditorState {
  return {
    name: preset?.name ?? "New Preset",
    fontFamily:
      (preset?.fontFamily as FontFamily) ?? FontFamily.COMPUTER_MODERN,
    fontSize: (preset?.fontSize as 10 | 11 | 12) ?? 11,
    sectionOrder:
      preset?.sectionOrder && preset.sectionOrder.length > 0
        ? (preset.sectionOrder as SectionOrder[])
        : DEFAULT_SECTION_ORDER,
  };
}

interface PresetEditorProps {
  editing: EditorState;
  onChange: (next: EditorState) => void;
}

function PresetEditor({ editing, onChange }: PresetEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = editing.sectionOrder.findIndex((s) => s.id === active.id);
    const newIndex = editing.sectionOrder.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(editing.sectionOrder, oldIndex, newIndex).map(
      (s, i) => ({ ...s, order: i }),
    );
    onChange({ ...editing, sectionOrder: reordered });
  };

  const toggleVisible = (id: string) => {
    onChange({
      ...editing,
      sectionOrder: editing.sectionOrder.map((s) =>
        s.id === id ? { ...s, visible: !s.visible } : s,
      ),
    });
  };

  return (
    <div className="space-y-6">
      {/* Name */}
      <div className="space-y-1.5">
        <Label>Preset name</Label>
        <Input
          value={editing.name}
          onChange={(e) => onChange({ ...editing, name: e.target.value })}
          placeholder="e.g. Clean 11pt"
        />
      </div>

      {/* Font family */}
      <div className="space-y-2">
        <Label>Font family</Label>
        <div className="grid grid-cols-1 gap-2">
          {FONT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...editing, fontFamily: opt.value })}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
                editing.fontFamily === opt.value
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              }`}
            >
              <span className="font-medium">{opt.label}</span>
              {editing.fontFamily === opt.value && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Font size */}
      <div className="space-y-2">
        <Label>Font size</Label>
        <ToggleGroup
          type="single"
          value={String(editing.fontSize)}
          onValueChange={(v) => {
            if (v)
              onChange({ ...editing, fontSize: Number(v) as 10 | 11 | 12 });
          }}
          className="justify-start"
        >
          {([10, 11, 12] as const).map((s) => (
            <ToggleGroupItem key={s} value={String(s)} aria-label={`${s}pt`}>
              {s}pt
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Section order */}
      <div className="space-y-2">
        <Label>Section order</Label>
        <p className="text-xs text-muted-foreground">
          Drag to reorder. Toggle the eye icon to hide a section.
        </p>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={editing.sectionOrder.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1.5">
              {editing.sectionOrder.map((section) => (
                <SortableSectionRow
                  key={section.id}
                  section={section}
                  onToggleVisible={toggleVisible}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

// ============================================
// Main page
// ============================================

export default function AppearancePage() {
  const { data, isLoading: presetsLoading } = useGetPresetsQuery();
  const [createPreset, { isLoading: creating }] = useCreatePresetMutation();
  const [updatePreset, { isLoading: saving }] = useUpdatePresetMutation();
  const [deletePreset] = useDeletePresetMutation();
  const [setDefault] = useSetDefaultPresetMutation();

  const presets: ResumePreset[] = (data?.data?.presets ?? []) as ResumePreset[];

  const [editorState, setEditorState] = useState<{
    selectedId: string | null;
    editing: EditorState;
    dirty: boolean;
  }>({
    selectedId: null,
    editing: buildEditorState(null),
    dirty: false,
  });

  const { selectedId, editing, dirty } = editorState;

  // Select the first / default preset on first load (single setState call avoids cascading renders)
  useEffect(() => {
    if (presets.length > 0 && editorState.selectedId === null) {
      const defaultPreset = presets.find((p) => p.isDefault) ?? presets[0];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditorState({
        selectedId: defaultPreset.id,
        editing: buildEditorState(defaultPreset),
        dirty: false,
      });
    }
  }, [presets, editorState.selectedId]);

  const handleSelectPreset = (preset: ResumePreset) => {
    setEditorState({
      selectedId: preset.id,
      editing: buildEditorState(preset),
      dirty: false,
    });
  };

  const handleEditorChange = useCallback((next: EditorState) => {
    setEditorState((prev) => ({ ...prev, editing: next, dirty: true }));
  }, []);

  const handleNewPreset = async () => {
    try {
      const created = await createPreset({
        name: "New Preset",
        fontFamily: FontFamily.COMPUTER_MODERN,
        fontSize: 11,
        sectionOrder: DEFAULT_SECTION_ORDER,
        isDefault: presets.length === 0,
      }).unwrap();
      const preset = (created as any).data?.preset ?? (created as any).preset;
      if (preset) {
        setEditorState({
          selectedId: preset.id,
          editing: buildEditorState(preset),
          dirty: false,
        });
      }
    } catch (err: any) {
      toast.error(
        err?.data?.error ?? err?.message ?? "Failed to create preset",
      );
    }
  };

  const handleSave = async () => {
    if (!selectedId) return;
    try {
      await updatePreset({
        presetId: selectedId,
        data: {
          name: editing.name,
          fontFamily: editing.fontFamily,
          fontSize: editing.fontSize,
          sectionOrder: editing.sectionOrder,
        },
      }).unwrap();
      toast.success("Preset saved");
      setEditorState((prev) => ({ ...prev, dirty: false }));
    } catch (err: any) {
      toast.error(err?.data?.error ?? err?.message ?? "Failed to save preset");
    }
  };

  const handleDelete = async (presetId: string) => {
    try {
      await deletePreset(presetId).unwrap();
      toast.success("Preset deleted");
      if (selectedId === presetId) {
        setEditorState({
          selectedId: null,
          editing: buildEditorState(null),
          dirty: false,
        });
      }
    } catch (err: any) {
      toast.error(
        err?.data?.error ?? err?.message ?? "Failed to delete preset",
      );
    }
  };

  const handleSetDefault = async (presetId: string) => {
    try {
      await setDefault(presetId).unwrap();
      toast.success("Default preset updated");
    } catch (err: any) {
      toast.error(
        err?.data?.error ?? err?.message ?? "Failed to update default",
      );
    }
  };

  const selectedPreset = presets.find((p) => p.id === selectedId);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left panel */}
      <div className="flex w-[420px] flex-none flex-col overflow-hidden border-r">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">Resume Appearance</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Presets control the font and section layout of generated resumes.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleNewPreset}
            disabled={creating}
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            New
          </Button>
        </div>

        {/* Preset list + editor */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {presetsLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!presetsLoading && presets.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">No presets yet.</p>
              <Button size="sm" onClick={handleNewPreset} disabled={creating}>
                <Plus className="mr-1 h-4 w-4" /> Create your first preset
              </Button>
            </div>
          )}

          {!presetsLoading && presets.length > 0 && (
            <>
              {/* Preset tabs */}
              <div className="flex flex-col gap-1">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 transition-colors ${
                      selectedId === preset.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => handleSelectPreset(preset)}
                  >
                    <span className="flex-1 truncate text-sm font-medium">
                      {preset.name}
                    </span>
                    {preset.isDefault && (
                      <Badge
                        variant="secondary"
                        className="h-4 px-1.5 py-0 text-[10px]"
                      >
                        Default
                      </Badge>
                    )}
                    <div
                      className="ml-1 flex gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        title="Set as default"
                        className={`rounded p-1 transition-colors hover:bg-background/20 ${
                          preset.isDefault ? "cursor-default opacity-50" : ""
                        }`}
                        onClick={() =>
                          !preset.isDefault && handleSetDefault(preset.id)
                        }
                        disabled={preset.isDefault}
                      >
                        <Star className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="Delete preset"
                        className="rounded p-1 transition-colors hover:bg-background/20"
                        onClick={() => handleDelete(preset.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Editor */}
              {selectedPreset && (
                <div className="space-y-4">
                  <PresetEditor
                    editing={editing}
                    onChange={handleEditorChange}
                  />

                  <Button
                    className="w-full"
                    onClick={handleSave}
                    disabled={!dirty || saving}
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Save preset
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right panel — live preview */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b px-6 py-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Live preview
            {selectedPreset && (
              <span className="ml-2 text-foreground">
                {selectedPreset.name}
              </span>
            )}
          </h2>
        </div>
        <div className="flex-1 overflow-auto">
          <AppearancePreview
            fontFamily={editing.fontFamily}
            fontSize={editing.fontSize}
            sectionOrder={editing.sectionOrder}
            className="bg-zinc-800 p-6"
          />
        </div>
      </div>
    </div>
  );
}
