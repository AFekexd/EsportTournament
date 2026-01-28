import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UiState {
    sidebarOpen: boolean;
    mobileMenuOpen: boolean;
    toast: {
        show: boolean;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
    };
    isSearchOpen: boolean;
}

const initialState: UiState = {
    sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
    mobileMenuOpen: false,
    toast: {
        show: false,
        message: '',
        type: 'info',
    },
    isSearchOpen: false,
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleSidebar: (state) => {
            state.sidebarOpen = !state.sidebarOpen;
        },
        setSidebarOpen: (state, action: PayloadAction<boolean>) => {
            state.sidebarOpen = action.payload;
        },
        toggleMobileMenu: (state) => {
            state.mobileMenuOpen = !state.mobileMenuOpen;
        },
        setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
            state.mobileMenuOpen = action.payload;
        },
        showToast: (
            state,
            action: PayloadAction<{ message: string; type: 'success' | 'error' | 'warning' | 'info' }>
        ) => {
            state.toast = {
                show: true,
                ...action.payload,
            };
        },
        hideToast: (state) => {
            state.toast.show = false;
        },
        toggleSearch: (state) => {
            state.isSearchOpen = !state.isSearchOpen;
        },
        setSearchOpen: (state, action: PayloadAction<boolean>) => {
            state.isSearchOpen = action.payload;
        },
    },
});

export const {
    toggleSidebar,
    setSidebarOpen,
    toggleMobileMenu,
    setMobileMenuOpen,
    showToast,
    hideToast,
    toggleSearch,
    setSearchOpen,
} = uiSlice.actions;
export default uiSlice.reducer;
