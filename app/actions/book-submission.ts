"use server";

import { submitBookPublishingApplication } from "@/lib/book-submissions/submit";

export async function submitBookPublishingForm(formData: FormData) {
  return submitBookPublishingApplication(formData);
}
