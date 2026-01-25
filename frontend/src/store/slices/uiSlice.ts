import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UiState {
    sidebarOpen: boolean;
    mobileMenuOpen: boolean;
    toast: {
        show: boolean;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
    };
}

const initialState: UiState = {
    sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
    mobileMenuOpen: false,
    toast: {
        show: false,
        message: '',
        type: 'info',
    },
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
    },
});

export const {
    toggleSidebar,
    setSidebarOpen,
    toggleMobileMenu,
    setMobileMenuOpen,
    showToast,
    hideToast,
} = uiSlice.actions;
export default uiSlice.reducer;
