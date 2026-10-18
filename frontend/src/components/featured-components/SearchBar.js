import React, { useState, useEffect, useRef } from 'react'
import Icon from '../icons'

export default function SearchBar({ query, setQuery, resetQuery }) {
    const [inputValue, setInputValue] = useState(query || '')
    const debounceTimerRef = useRef(null)

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
            resetQuery()
        }
        // eslint-disable-next-line
    }, [])

    // Sync input when external query changes
    useEffect(() => {
        if (query !== inputValue && query === '') {
            setInputValue('')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query])

    const handleChange = (e) => {
        const val = e.target.value
        setInputValue(val)

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }

        debounceTimerRef.current = setTimeout(() => {
            setQuery(val)
        }, 300)
    }

    const handleClear = () => {
        setInputValue('')
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        setQuery('')
    }

    return (
        <div className="SearchContainer">
            <div className='SearchBar' style={{ position: 'relative' }}>
                <div style={iconStyle}>
                    <Icon name="N-Search" /> 
                </div>
                <input 
                    className='SearchInput no-outline' 
                    maxLength='80' 
                    autoCorrect='off' 
                    autoCapitalize='off' 
                    spellCheck='false'
                    autoFocus={true}
                    placeholder='What do you want to play?'
                    value={inputValue}
                    onChange={handleChange}
                />
                {inputValue && (
                    <button 
                        onClick={handleClear} 
                        style={clearButtonStyle} 
                        title="Clear search"
                        type="button"
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
    )
}

const iconStyle = {
    position: 'absolute',
    top: '0',
    bottom: '0',
    left: '12px',
    display: 'flex',
    alignItems: 'center',
    cursor: 'text',
    pointerEvents: 'none'
}

const clearButtonStyle = {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#b3b3b3',
    fontSize: '20px',
    lineHeight: '1',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
}
