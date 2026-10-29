/**
 * CareLoop MVP v2 - Seed Data
 * 
 * Seeds demo data for all three merchant types:
 * 1. Boarding/Groomer (Paw Seasons Pet Hotel & Spa) - PRIMARY DEMO
 * 2. Vet/Clinic (Riverton Veterinary Clinic)
 * 3. Pet Store / Pet Food Merchant (PawPrima Pet Nutrition)
 */

const data = require('./data');

const { 
  addWhitelistEntry, 
  createCareContext, 
  createFollowUpMessage,
  submitForApproval,
  approveMessage,
  rejectMessage,
  sendMessage,
  addResponse,
  writeAudit,
  getMessage,
  _db,
} = data;

function seedAll() {
  console.log('🌱 Seeding CareLoop MVP v2 demo data...');

  // ==========================================
  // 1. WHITELIST (4 entries per merchant type)
  // ==========================================
  
  console.log('   → Seeding whitelist entries...');

  // Boarding/Groomer whitelist (4 entries)
  const wl_bg_1 = addWhitelistEntry({
    email: 'emma.harper.example@email.com',
    merchantType: 'boarding_groomer',
    status: 'active',
    addedBy: 'seed',
    notes: 'Bella (golden retriever) owner - grooming regular',
  });
  const wl_bg_2 = addWhitelistEntry({
    email: 'danielle.cook.example@email.com',
    merchantType: 'boarding_groomer',
    status: 'active',
    addedBy: 'seed',
    notes: 'Moose (bulldog) owner - boarding guest',
  });
  const wl_bg_3 = addWhitelistEntry({
    email: 'olivia.parker.example@email.com',
    merchantType: 'boarding_groomer',
    status: 'active',
    addedBy: 'seed',
    notes: 'Luna (siamese cat) owner - cat boarding + spa',
  });
  const wl_bg_4 = addWhitelistEntry({
    email: 'mark.bennett.example@email.com',
    merchantType: 'boarding_groomer',
    status: 'disabled',
    addedBy: 'seed',
    notes: 'TEST: Disabled entry for negative testing',
  });

  // Vet/Clinic whitelist (3 entries)
  const wl_vet_1 = addWhitelistEntry({
    email: 'james.wilson.example@email.com',
    merchantType: 'vet_clinic',
    status: 'active',
    addedBy: 'seed',
    notes: 'Bella (golden retriever) owner',
  });
  const wl_vet_2 = addWhitelistEntry({
    email: 'sarah.mitchell.example@email.com',
    merchantType: 'vet_clinic',
    status: 'active',
    addedBy: 'seed',
    notes: 'Luna (siamese cat) owner',
  });
  const wl_vet_3 = addWhitelistEntry({
    email: 'robert.chen.example@email.com',
    merchantType: 'vet_clinic',
    status: 'active',
    addedBy: 'seed',
    notes: 'Max (bulldog) owner',
  });

  // Pet Store whitelist (3 entries)
  const wl_store_1 = addWhitelistEntry({
    email: 'rachel.green.example@email.com',
    merchantType: 'pet_store',
    status: 'active',
    addedBy: 'seed',
    notes: 'Premium food subscriber',
  });
  const wl_store_2 = addWhitelistEntry({
    email: 'tom.jackson.example@email.com',
    merchantType: 'pet_store',
    status: 'active',
    addedBy: 'seed',
    notes: 'New customer - food transition trial',
  });

  // ==========================================
  // 2. BOARDING/GROOMER CARE CONTEXTS (MAIN DEMO)
  // ==========================================
  
  console.log('   → Seeding Boarding/Groomer care contexts...');

  // --- Context 1: Bella - Grooming follow-up (MAIN PATH: approve → send → response) ---
  const ctx_bg_1 = createCareContext({
    petName: 'Bella',
    petType: 'Golden Retriever, 4y F',
    ownerName: 'Emma Harper',
    ownerEmail: 'emma.harper.example@email.com',
    contextType: 'grooming_appointment',
    contextDetails: 'Full grooming service (bath, brush, nail trim, ear clean). Skin appeared slightly sensitive during bath. No major issues noted.',
    merchantType: 'boarding_groomer',
    riskLevel: 'normal',
    actor: 'seed',
  });

  const msg_bg_1 = createFollowUpMessage({
    careContextId: ctx_bg_1.id,
    title: 'How is Bella feeling after her grooming visit?',
    body: `Hi Emma,

We hope Bella is settling in nicely after her grooming session at Paw Seasons Pet Hotel & Spa today! She was such a good girl during her appointment.

A quick check-in to see how her skin is feeling. We noticed a little sensitivity during her bath and wanted to make sure everything is okay at home.

Things you can do to help:
• Keep an eye on any redness or excessive scratching
• If she seems itchy, a cool damp cloth can soothe the area
• Avoid any scented shampoos or products at home for the next few days

If you notice anything that concerns you, please don't hesitate to reach out to us or consult your veterinarian.

This is a supportive follow-up from your grooming care team. It is not a diagnosis and does not replace a veterinary examination.

Warm regards,
The Paw Seasons Team`,
    templateId: 'grooming_post_visit',
    riskFlags: ['skin_sensitivity_observed'],
    merchantType: 'boarding_groomer',
    actor: 'seed',
  });

  // ==========================================
  // For Boarding/Groomer main demo path:
  // Bella → approved → sent → response (concerning)
  // ==========================================

  // Submit and approve the message
  submitForApproval(msg_bg_1.id, 'jamie_groomer');
  approveMessage(msg_bg_1.id, 'taylor_manager', 'Looks good - standard post-grooming check-in.');
  
  // Send it
  const sendResult = sendMessage(msg_bg_1.id, 'taylor_manager');

  // Add a concerning response to demonstrate timeline and escalation
  setTimeout(() => {
    addResponse(msg_bg_1.id, 
      "Hi, thanks for checking in. Bella is still scratching a lot and her skin looks a bit red. It's still an issue - do you have any suggestions for what we can do?",
      'email',
      'emma.harper.example@email.com'
    );
  }, 200);

  // --- Context 2: Moose - Boarding checkout (NEGATIVE DEMO: rejected) ---
  const ctx_bg_2 = createCareContext({
    petName: 'Moose',
    petType: 'English Bulldog, 6y M',
    ownerName: 'Danielle Cook',
    ownerEmail: 'danielle.cook.example@email.com',
    contextType: 'boarding_checkout',
    contextDetails: '3-night boarding stay. Moose did well, ate normally, active and playful. Owner explicitly declined follow-up communications at check-out.',
    merchantType: 'boarding_groomer',
    riskLevel: 'normal',
    actor: 'seed',
  });

  const msg_bg_2 = createFollowUpMessage({
    careContextId: ctx_bg_2.id,
    title: 'Hope Moose is settling back in at home!',
    body: `Hi Danielle,

We wanted to check in after Moose's recent stay with us at Paw Seasons Pet Hotel & Spa. He was such a delightful guest — always ready for his walks and loved playtime in the yard!

We hope he's settling back into his home routine comfortably.

Just a few things to note:
• Moose's appetite was great during his stay, he loved the turkey dinner
• He enjoyed his daily walks and play sessions
• Everything was normal at his departure check

If you'd like to book your next stay or have any questions, just let us know!

This is a friendly follow-up from your pet care team.

Warm regards,
The Paw Seasons Team`,
    templateId: 'boarding_post_stay',
    riskFlags: [],
    merchantType: 'boarding_groomer',
    actor: 'seed',
  });

  // Submit for approval — then REJECTED to demonstrate rejection path
  submitForApproval(msg_bg_2.id, 'jamie_groomer');
  rejectMessage(msg_bg_2.id, 'taylor_manager', 'Owner explicitly opted out of follow-up communications at check-out. Do not send.');

  // --- Context 3: Luna - Cat boarding (DANGER SIGNAL: escalation path) ---
  const ctx_bg_3 = createCareContext({
    petName: 'Luna',
    petType: 'Siamese Cat, 3y F',
    ownerName: 'Olivia Parker',
    ownerEmail: 'olivia.parker.example@email.com',
    contextType: 'boarding_checkout',
    contextDetails: '5-night cat boarding. Luna was quiet but ate normally. Staff noted she was scratching near her ears on the last day. No discharge visible but worth flagging to owner.',
    merchantType: 'boarding_groomer',
    riskLevel: 'high',
    actor: 'seed',
  });

  const msg_bg_3 = createFollowUpMessage({
    careContextId: ctx_bg_3.id,
    title: 'Luna is back home — quick check-in from Paw Seasons',
    body: `Hi Olivia,

Luna was a lovely guest during her stay at Paw Seasons Pet Hotel & Spa's cat suite. We noticed she was doing some scratching near her ears on her last day, so we wanted to flag that for you.

Things to watch for:
• Excessive scratching or head shaking
• Any discharge or odor from the ears
• Redness or swelling around the ear area

If you notice any of these signs, we recommend reaching out to your veterinarian for a check-up. Ear issues can be uncomfortable and are best addressed promptly.

Please let us know how Luna is doing at home!

This is a supportive follow-up from your pet care team. It is not a diagnosis and does not replace a veterinary examination.

Warm regards,
The Paw Seasons Team`,
    templateId: 'boarding_post_stay_concerning',
    riskFlags: ['ear_scratching_observed', 'owner_should_monitor'],
    merchantType: 'boarding_groomer',
    actor: 'seed',
  });

  // Submit for approval — stays in pending to demonstrate approval queue
  submitForApproval(msg_bg_3.id, 'jamie_groomer');

  // ==========================================
  // 3. VET/CLINIC CARE CONTEXTS (SIMPLER)
  // ==========================================
  
  console.log('   → Seeding Vet/Clinic care contexts...');

  // Vet Context 1: Bella - GI follow-up (veterinary)
  const ctx_vet_1 = createCareContext({
    petName: 'Bella',
    petType: 'Golden Retriever, 4y F',
    ownerName: 'James Wilson',
    ownerEmail: 'james.wilson.example@email.com',
    contextType: 'gastroenteritis_visit',
    contextDetails: 'Presented with vomiting and diarrhea for 24 hours. Diagnosed with acute gastroenteritis. Prescribed supportive care: anti-emetics, probiotics, bland diet. Recheck if not improved in 48h.',
    merchantType: 'vet_clinic',
    riskLevel: 'normal',
    actor: 'seed',
  });

  const msg_vet_1 = createFollowUpMessage({
    careContextId: ctx_vet_1.id,
    title: 'Checking in on Bella after her visit',
    body: `Hi James,

Just checking in on Bella after her visit to Riverton Veterinary Clinic earlier today. We hope she's starting to feel more comfortable.

As discussed during your visit:
• Continue medications as prescribed
• Offer small amounts of the bland diet frequently
• Make sure she has access to fresh water
• Restrict exercise for the next 24-48 hours

⚠️ Please contact us immediately if you notice:
• Persistent vomiting or diarrhea
• Lethargy or weakness
• Refusal to drink water
• Bloody stool or vomit
• Fever or abdominal pain

If you have any questions or concerns, please don't hesitate to reach out.

This message is for follow-up support only and does not replace a veterinary examination. If Bella's condition worsens, please contact the clinic or seek emergency care.

Best regards,
The Riverton Vet Clinic Team`,
    templateId: 'gi_followup',
    riskFlags: ['red_flags_listed'],
    merchantType: 'vet_clinic',
    actor: 'seed',
  });

  submitForApproval(msg_vet_1.id, 'dr_alex');
  approveMessage(msg_vet_1.id, 'dr_alex', 'Standard GI follow-up, approved.');
  sendMessage(msg_vet_1.id, 'dr_alex');

  // Vet Context 2: Max - Dental (pending approval)
  const ctx_vet_2 = createCareContext({
    petName: 'Max',
    petType: 'English Bulldog, 5y M',
    ownerName: 'Robert Chen',
    ownerEmail: 'robert.chen.example@email.com',
    contextType: 'dental_procedure',
    contextDetails: 'Dental cleaning with 2 extractions. Recovering well. Pain medication and soft food prescribed.',
    merchantType: 'vet_clinic',
    riskLevel: 'normal',
    actor: 'seed',
  });

  const msg_vet_2 = createFollowUpMessage({
    careContextId: ctx_vet_2.id,
    title: 'Post-dental care instructions for Max',
    body: `Hi Robert,

We hope Max is recovering comfortably after his dental procedure at Riverton Veterinary Clinic. He did very well during the procedure and was bright and alert when he went home.

Home care instructions:
• Pain medication as prescribed every 12 hours for the next 3 days
• Soft food only for the next 7-10 days
• Avoid chew toys, bones, or hard treats during recovery
• Gentle dental wipes can be used starting day 5

⚠️ Contact us if you notice:
• Excessive drooling or bleeding
• Refusal to eat or drink
• Lethargy or swelling of the face
• Fever

Please feel free to reach out if you have any questions about Max's recovery.

This message is for follow-up support only and does not replace a veterinary examination.

Best regards,
The Riverton Vet Clinic Team`,
    templateId: 'dental_followup',
    riskFlags: ['post_procedure_monitoring'],
    merchantType: 'vet_clinic',
    actor: 'seed',
  });

  submitForApproval(msg_vet_2.id, 'dr_alex');
  // Stays in pending_approval to show approval queue

  // ==========================================
  // 4. PET STORE CARE CONTEXTS (SIMPLEST)
  // ==========================================
  
  console.log('   → Seeding Pet Store care contexts...');

  // Store Context 1: Food transition follow-up
  const ctx_store_1 = createCareContext({
    petName: 'Charlie',
    petType: 'Labrador, 3y M',
    ownerName: 'Rachel Green',
    ownerEmail: 'rachel.green.example@email.com',
    contextType: 'food_transition',
    contextDetails: 'Customer transitioning from regular kibble to PawPrima Grain-Free Salmon formula. Started 3 days ago, wants guidance on transition timeline.',
    merchantType: 'pet_store',
    riskLevel: 'normal',
    actor: 'seed',
  });

  const msg_store_1 = createFollowUpMessage({
    careContextId: ctx_store_1.id,
    title: 'How is Charlie adjusting to his new food?',
    body: `Hi Rachel,

Thanks for trying PawPrima Grain-Free Salmon formula! We wanted to check in on how Charlie is adjusting to his new food.

If you're still transitioning, we recommend this schedule:
• Days 1-3: 25% new food, 75% old food
• Days 4-6: 50% new food, 50% old food
• Days 7-9: 75% new food, 25% old food
• Day 10+: 100% new food

Some gentle digestive adjustments are normal during transitions. Things to watch for:
• Loose stool or mild digestive changes (these usually resolve on their own)
• A temporary decrease in appetite while he adjusts to the new taste

If you have any questions or need more guidance, our pet nutrition advisors are here to help!

Happy feeding,
The PawPrima Team`,
    templateId: 'food_transition_checkin',
    riskFlags: [],
    merchantType: 'pet_store',
    actor: 'seed',
  });

  submitForApproval(msg_store_1.id, 'nutrition_advisor');
  approveMessage(msg_store_1.id, 'store_manager', 'Standard food transition check-in.');
  sendMessage(msg_store_1.id, 'store_manager');

  // Store Context 2: New customer welcome
  const ctx_store_2 = createCareContext({
    petName: 'Mochi',
    petType: 'Shiba Inu, 2y F',
    ownerName: 'Tom Jackson',
    ownerEmail: 'tom.jackson.example@email.com',
    contextType: 'first_purchase',
    contextDetails: 'First-time customer. Purchased PawPrima Puppy Starter Kit + dental chews. Follow-up to ensure satisfaction and offer support.',
    merchantType: 'pet_store',
    riskLevel: 'normal',
    actor: 'seed',
  });

  const msg_store_2 = createFollowUpMessage({
    careContextId: ctx_store_2.id,
    title: 'Welcome to the PawPrima family, Mochi & Tom!',
    body: `Hi Tom,

Welcome to PawPrima! We're so excited that Mochi is trying our Puppy Starter Kit.

Here are a few tips to get the most out of your new products:
• Start with the recommended portion size and adjust based on Mochi's activity level
• The dental chews work best when given daily after meals
• Store food in a cool, dry place — an airtight container keeps it fresh longer

If you have any questions about feeding, nutrition, or which products might be best for Mochi, our team is always happy to help.

We'd love to hear how Mochi likes her new food!

Warmly,
The PawPrima Team`,
    templateId: 'new_customer_welcome',
    riskFlags: [],
    merchantType: 'pet_store',
    actor: 'seed',
  });

  submitForApproval(msg_store_2.id, 'nutrition_advisor');
  // Stays in pending

  console.log('✅ Seed complete!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Whitelist entries: ${data.listWhitelist().length}`);
  console.log(`   Care contexts: ${data.listCareContexts().length}`);
  console.log(`   Messages: ${data.listMessages().length}`);
  console.log(`   Mock outbox: ${data.getMockOutbox().length}`);
  console.log(`   Audit events: ${data.getAllAudit(null, 10000).length}`);
  console.log('');
  console.log('🏨 Boarding/Groomer:');
  console.log(`   Contexts: ${data.listCareContexts('boarding_groomer').length}`);
  console.log(`   Pending approval: ${data.listMessages('boarding_groomer', 'pending_approval').length}`);
  console.log(`   Sent: ${data.getMockOutbox('boarding_groomer').length}`);
  console.log('');
  console.log('🏥 Vet/Clinic:');
  console.log(`   Contexts: ${data.listCareContexts('vet_clinic').length}`);
  console.log(`   Pending approval: ${data.listMessages('vet_clinic', 'pending_approval').length}`);
  console.log('');
  console.log('🛒 Pet Store:');
  console.log(`   Contexts: ${data.listCareContexts('pet_store').length}`);
  console.log(`   Pending approval: ${data.listMessages('pet_store', 'pending_approval').length}`);
}

if (require.main === module) {
  seedAll();
}

module.exports = { seedAll };
