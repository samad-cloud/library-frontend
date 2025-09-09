import { Inngest } from 'inngest'

// Create an Inngest client
export const inngest = new Inngest({ 
  id: 'generapix-bulk-processor',
  name: 'GeneraPix Bulk Image Processor',
  eventKey: process.env.INNGEST_EVENT_KEY,
})