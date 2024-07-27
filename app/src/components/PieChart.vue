<template>
  <v-chart class="chart" :option="option" autoresize v-if="props.data.length" />
</template>

<script setup>
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { ref } from 'vue'

const props = defineProps(['data', 'title'])

use([CanvasRenderer, PieChart, TitleComponent, TooltipComponent, LegendComponent])

const option = ref({
  title: {
    text: props.title,
    left: 'center'
  },
  tooltip: {
    trigger: 'item',
    formatter: '{a} <br/>{b} : {c} ({d}%)'
  },
  legend: {
    data: props.data.map((item) => item.name),
    orient: 'vertical',
    left: 'left'
  },
  series: [
    {
      name: props.title,
      type: 'pie',
      radius: '55%',
      center: ['50%', '60%'],
      data: props.data,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }
  ]
})
</script>

<style scoped>
.chart {
  height: 100%;

  @media (max-width: 1024px) {
    height: 45vh;
  }
  @media (max-width: 720px) {
    height: 45vh;
  }
}
</style>
