import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useConverterStore = defineStore('converter', () => {
  const conversions = ref([])
  const isConverting = ref(false)
  const settings = ref({
    extractImages: true,
    imageDir: './images',
    preserveLatex: true,
    convertSvg: true,
    renderMath: true,
    mathToImage: true
  })

  const totalConversions = computed(() => conversions.value.length)
  
  const successfulConversions = computed(() => 
    conversions.value.filter(c => c.status === 'success').length
  )

  const failedConversions = computed(() =>
    conversions.value.filter(c => c.status === 'error').length
  )

  function addConversion(conversion) {
    conversions.value.unshift({
      id: Date.now(),
      timestamp: new Date(),
      status: 'pending',
      ...conversion
    })
  }

  function updateConversion(id, updates) {
    const index = conversions.value.findIndex(c => c.id === id)
    if (index !== -1) {
      conversions.value[index] = { ...conversions.value[index], ...updates }
    }
  }

  function removeConversion(id) {
    const index = conversions.value.findIndex(c => c.id === id)
    if (index !== -1) {
      conversions.value.splice(index, 1)
    }
  }

  function clearHistory() {
    conversions.value = []
  }

  function updateSettings(newSettings) {
    settings.value = { ...settings.value, ...newSettings }
  }

  return {
    conversions,
    isConverting,
    settings,
    totalConversions,
    successfulConversions,
    failedConversions,
    addConversion,
    updateConversion,
    removeConversion,
    clearHistory,
    updateSettings
  }
})