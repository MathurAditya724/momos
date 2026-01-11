import slugify from "@sindresorhus/slugify";
import { nanoid } from "nanoid";

// Generate unique ID with slug
export function generateUniqueId(name: string, existingIds: string[]): string {
  const slug = slugify(name);

  // Check if slug exists
  if (!existingIds.includes(slug)) {
    return slug;
  }

  // Append nanoid if slug exists
  return `${slug}-${nanoid(6)}`;
}
