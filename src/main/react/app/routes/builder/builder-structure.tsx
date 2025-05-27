import MagnifierIcon from '/icons/solar/Magnifier.svg?react'

export default function BuilderStructure() {
  return (
    <>
      <div className="relative px-4">
        <label htmlFor="search" className="absolute top-1/2 left-6 -translate-y-1/2">
          <MagnifierIcon className="fill-foreground-muted h-auto w-4" />
        </label>
        <input
          id="search"
          className="border-border w-full rounded-full border bg-gray-100 py-1 pr-4 pl-7"
          type="search"
          placeholder="Search"
        />
      </div>
      <ul>
        <li>file1</li>
        <li>file2</li>
        <li>file3</li>
        <li>file4</li>
        <li>file5</li>
        <li>file6</li>
        <li>file7</li>
        <li>file8</li>
        <li>file9</li>
        <li>file10</li>
      </ul>
    </>
  )
}
