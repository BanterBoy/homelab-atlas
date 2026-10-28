<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { withBase } from 'vitepress'
import { guideFigures, type GuideFigureName } from './guide-figures'

const props = defineProps<{ name: GuideFigureName }>()
const expanded = ref(false)
const scroller = ref<HTMLElement>()
const figure = computed(() => guideFigures[props.name])
const gutter = computed(() => figure.value.circleRadius + 10)
const viewBox = computed(() => {
  const { x, y, width, height } = figure.value.crop
  const pad = gutter.value
  return `${x - pad} ${y - pad} ${width + pad * 2} ${height + pad * 2}`
})
const naturalWidth = computed(() => `${figure.value.crop.width + gutter.value * 2}px`)

async function toggleSize() {
  expanded.value = !expanded.value
  if (expanded.value) {
    await nextTick()
    scroller.value?.focus()
  }
}
</script>

<template>
  <figure class="guide-figure">
    <div class="guide-figure__header">
      <strong>{{ figure.title }}</strong>
      <button type="button" :aria-pressed="expanded" @click="toggleSize">
        {{ expanded ? 'Fit to page' : 'Enlarge screenshot' }}
      </button>
    </div>
    <div
      ref="scroller"
      class="guide-figure__scroller"
      :class="{ 'is-expanded': expanded }"
      :style="{ '--guide-natural-width': naturalWidth }"
      :tabindex="expanded ? 0 : undefined"
      :aria-label="expanded ? `Enlarged ${figure.title}; scroll to inspect` : undefined"
    >
      <svg
        class="guide-figure__svg"
        :viewBox="viewBox"
        :aria-labelledby="`guide-title-${name} guide-desc-${name}`"
        role="img"
      >
        <title :id="`guide-title-${name}`">{{ figure.title }}</title>
        <desc :id="`guide-desc-${name}`">{{ figure.description }}</desc>
        <defs>
          <clipPath :id="`guide-clip-${name}`">
            <rect v-bind="figure.crop" />
          </clipPath>
          <marker :id="`guide-arrow-${name}`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>
        <rect class="guide-figure__surface" :x="figure.crop.x - gutter" :y="figure.crop.y - gutter" :width="figure.crop.width + gutter * 2" :height="figure.crop.height + gutter * 2" rx="18" />
        <image :href="withBase(`/guides/${figure.image}`)" width="2355" height="1583" :clip-path="`url(#guide-clip-${name})`" />
        <g aria-hidden="true">
          <g v-for="(mark, index) in figure.marks" :key="index" :class="{ 'is-accent': mark.accent }">
            <rect class="guide-figure__mark" v-bind="mark.rect" rx="7" />
            <line class="guide-figure__arrow" :x1="mark.circle[0]" :y1="mark.circle[1]" :x2="mark.target[0]" :y2="mark.target[1]" :marker-end="`url(#guide-arrow-${name})`" />
            <circle class="guide-figure__number" :cx="mark.circle[0]" :cy="mark.circle[1]" :r="figure.circleRadius" />
            <text class="guide-figure__number-text" :x="mark.circle[0]" :y="mark.circle[1]">{{ index + 1 }}</text>
          </g>
        </g>
      </svg>
    </div>
    <ol class="guide-figure__captions">
      <li v-for="(mark, index) in figure.marks" :key="index">{{ mark.caption }}</li>
    </ol>
  </figure>
</template>
