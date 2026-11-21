# IDI landing page content

## Header

- Brand: IDI
- Navigation: [Try the example](#delivery-example) · [For developers](#for-developers)

## Opening

### The right controls, at the right time.

Say what you want to do. No more digging through menus or figuring out which screen you need.

### Delivery example

**User** — I’m waiting on a desk and a chair. When are they coming?

**Agent** — Here are your **ongoing deliveries**. You can see when each one is due.

**User** — I see the desk is due tomorrow morning. I’ll be at work then. Can I pick a later time?

**Agent** — I’ve opened the **time picker** for your desk delivery. Choose a time that works for you and confirm it.

## Intent-Driven Interface

### Control · You make the call.

AI finds the right control fast. You review the details and click when you’re ready to take action.

*Confirmed by you*

### Privacy · Show the control, not the data.

AI needs to know which controls your app offers. It doesn’t need to see the data they display.

*Records stay in the app*

### Personalization · Pin it once. Move faster every day.

Keep your go-to controls on your home screen, already set up your way. No searching. No starting over.

*Pinned: My deliveries*

### History · Find your way back.

Reopen the view you used two weeks ago without remembering what you asked or how you got there.

*Delivery times · 2 weeks ago*

## Offline mode

### Nothing leaves your device.

In offline mode, you get the AI-first experience without any data ever leaving your device.

**Available on this device**  
Requests, controls, and data

## For developers

### Build this into your app.

Intent-Driven Interface matches user intent to interactive React components. When someone asks for a different delivery time, the framework shows your time picker.

- [Get started](https://github.com/futuristic-digital/intent-driven-interface#use-in-a-host-application)
- [View source](https://github.com/futuristic-digital/intent-driven-interface)

`components.ts`

```ts
import { defineComponentMap }
  from "@intent-driven-interface/frontend";

export const components = defineComponentMap({
  selectDeliverySlot,
});
```
