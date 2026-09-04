import { Search } from 'lucide-react'

export function SearchBar() {
  return <label className="search-box"><Search size={17} /><input aria-label="Search campus" placeholder="Search campus..." /></label>
}
