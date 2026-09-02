/**
 * Keep agent prose visually professional by removing emoji pictographs while
 * leaving ordinary punctuation, accents, code and symbols untouched.
 */
export function removeDecorativeEmoji(value: string): string {
  return value
    .replace(
      /(?:\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic})(?:\uFE0F|\p{Emoji_Modifier}|\u200D\p{Extended_Pictographic})*/gu,
      "",
    )
    .replace(/[ \t]+(?=\n|$)/g, "");
}
