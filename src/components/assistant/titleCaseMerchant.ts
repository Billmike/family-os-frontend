const isLetter = (character: string) => /\p{L}/u.test(character)

const isLowerLetter = (character: string) => (
  isLetter(character)
  && character === character.toLowerCase()
  && character !== character.toUpperCase()
)

const isUpperLetter = (character: string) => (
  isLetter(character)
  && character === character.toUpperCase()
  && character !== character.toLowerCase()
)

const titleCaseMerchantToken = (token: string) => {
  const letters = Array.from(token).filter(isLetter)
  if (letters.length === 0) return token
  const hasUniformCase = letters.every(isLowerLetter) || letters.every(isUpperLetter)
  if (!hasUniformCase) return token
  const [first = '', ...rest] = Array.from(token)
  const titledFirst = isLetter(first) ? first.toUpperCase() : first
  return titledFirst + rest.map(character => (
    isLetter(character) ? character.toLowerCase() : character
  )).join('')
}

export const titleCaseMerchant = (merchant: string) => {
  const trimmed = merchant.trim()
  if (!trimmed) return ''
  return trimmed.split(/\s+/).map(titleCaseMerchantToken).join(' ')
}
