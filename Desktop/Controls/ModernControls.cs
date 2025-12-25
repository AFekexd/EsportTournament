using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;
using System.ComponentModel;

namespace EsportManager.Controls
{
    public static class UiColors
    {
        // Dark Theme Palette
        public static Color Background = Color.FromArgb(23, 23, 28);      // hsl(240, 10%, 10%)
        public static Color Card = Color.FromArgb(34, 34, 41);            // hsl(240, 10%, 15%)
        public static Color Foreground = Color.FromArgb(250, 250, 250);   // hsl(0, 0%, 98%)
        
        // Brand Colors
        public static Color Primary = Color.FromArgb(180, 77, 255);       // hsl(270, 100%, 65%)
        public static Color NeonPink = Color.FromArgb(255, 77, 196);      // hsl(320, 100%, 65%)
        public static Color Accent = Color.FromArgb(26, 255, 255);        // hsl(180, 100%, 55%)
        
        // UI Elements
        public static Color Border = Color.FromArgb(68, 68, 71);          // hsl(240, 5%, 28%)
        public static Color InputBg = Color.FromArgb(26, 26, 31);         // Slightly darker than card
    }

    public class ModernButton : Button
    {
        private bool _isHovered = false;
        private bool _isPressed = false;

        [Category("Appearance")]
        public Color StartColor { get; set; } = UiColors.Primary;

        [Category("Appearance")]
        public Color EndColor { get; set; } = UiColors.NeonPink;

        [Category("Appearance")]
        public int BorderRadius { get; set; } = 8; // rounded-md roughly

        public ModernButton()
        {
            this.FlatStyle = FlatStyle.Flat;
            this.FlatAppearance.BorderSize = 0;
            this.Size = new Size(150, 40);
            this.BackColor = Color.Transparent;
            this.ForeColor = Color.White;
            this.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            this.Cursor = Cursors.Hand;
        }

        protected override void OnMouseEnter(EventArgs e)
        {
            base.OnMouseEnter(e);
            _isHovered = true;
            Invalidate();
        }

        protected override void OnMouseLeave(EventArgs e)
        {
            base.OnMouseLeave(e);
            _isHovered = false;
            Invalidate();
        }

        protected override void OnMouseDown(MouseEventArgs mevent)
        {
            base.OnMouseDown(mevent);
            _isPressed = true;
            Invalidate();
        }

        protected override void OnMouseUp(MouseEventArgs mevent)
        {
            base.OnMouseUp(mevent);
            _isPressed = false;
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs pevent)
        {
            var g = pevent.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            // Gradient logic
            Color c1 = StartColor;
            Color c2 = EndColor;

            if (_isHovered)
            {
                // Lighten slightly on hover
                c1 = ControlPaint.Light(c1, 0.1f);
                c2 = ControlPaint.Light(c2, 0.1f);
            }
            if (_isPressed)
            {
                c1 = ControlPaint.Dark(c1, 0.1f);
                c2 = ControlPaint.Dark(c2, 0.1f);
            }

            var rect = new Rectangle(0, 0, Width, Height);
            
            using (var path = GetRoundedPath(rect, BorderRadius))
            using (var brush = new LinearGradientBrush(rect, c1, c2, 135f)) // 135deg gradient
            {
                // Shadow/Glow effect (simulate by drawing slightly larger semitransparent behind? 
                // Winforms painting is clipped to bounds, so hard to do outer glow without custom parent.
                // We will just fill the button.)
                g.FillPath(brush, path);
                
                // Text
                TextRenderer.DrawText(g, Text, Font, rect, ForeColor, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
            }
        }

        private GraphicsPath GetRoundedPath(Rectangle rect, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            float r = radius;
            path.AddArc(rect.X, rect.Y, r, r, 180, 90);
            path.AddArc(rect.Right - r, rect.Y, r, r, 270, 90);
            path.AddArc(rect.Right - r, rect.Bottom - r, r, r, 0, 90);
            path.AddArc(rect.X, rect.Bottom - r, r, r, 90, 90);
            path.CloseFigure();
            return path;
        }
    }

    // A panel wrapper for a TextBox to give it a modern border/background
    public class ModernTextBox : Panel
    {
        public TextBox InnerTextBox { get; private set; }

        private Color _borderColor = UiColors.Border;
        private Color _focusBorderColor = UiColors.Primary;
        private bool _isFocused = false;

        public override string Text
        {
            get => InnerTextBox.Text;
            set => InnerTextBox.Text = value;
        }
        
        public bool UseSystemPasswordChar
        {
            get => InnerTextBox.UseSystemPasswordChar;
            set => InnerTextBox.UseSystemPasswordChar = value;
        }

        public char PasswordChar
        {
            get => InnerTextBox.PasswordChar;
            set => InnerTextBox.PasswordChar = value;
        }

        public ModernTextBox()
        {
            this.Padding = new Padding(10, 7, 10, 7);
            this.Size = new Size(200, 35);
            this.BackColor = UiColors.InputBg; // Dark input bg
            
            InnerTextBox = new TextBox();
            InnerTextBox.BorderStyle = BorderStyle.None;
            InnerTextBox.BackColor = this.BackColor;
            InnerTextBox.ForeColor = Color.White;
            InnerTextBox.Font = new Font("Segoe UI", 10F);
            InnerTextBox.Dock = DockStyle.Fill;
            InnerTextBox.Enter += (s, e) => { _isFocused = true; Invalidate(); };
            InnerTextBox.Leave += (s, e) => { _isFocused = false; Invalidate(); };
            
            this.Controls.Add(InnerTextBox);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            var g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            var borderRect = new Rectangle(0, 0, Width - 1, Height - 1);
            var color = _isFocused ? _focusBorderColor : _borderColor;
            
            // Draw rounded border
            using (var pen = new Pen(color, _isFocused ? 2 : 1))
            using (var path = GetRoundedPath(borderRect, 8))
            {
                g.DrawPath(pen, path);
            }
        }

        private GraphicsPath GetRoundedPath(Rectangle rect, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            float r = radius;
            path.AddArc(rect.X, rect.Y, r, r, 180, 90);
            path.AddArc(rect.Right - r, rect.Y, r, r, 270, 90);
            path.AddArc(rect.Right - r, rect.Bottom - r, r, r, 0, 90);
            path.AddArc(rect.X, rect.Bottom - r, r, r, 90, 90);
            path.CloseFigure();
            return path;
        }

        // Forward usage
        public new event KeyEventHandler KeyDown
        {
            add => InnerTextBox.KeyDown += value;
            remove => InnerTextBox.KeyDown -= value;
        }
        
        public new void Focus()
        {
            InnerTextBox.Focus();
        }
        
        public void Clear() => InnerTextBox.Clear();
    }
}
