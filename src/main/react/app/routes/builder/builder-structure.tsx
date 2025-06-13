import MagnifierIcon from '/icons/solar/Magnifier.svg?react'
import Search from '~/components/search/search'

export default function BuilderStructure() {
  return (
    <>
      <Search onChange={console.log} />
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
